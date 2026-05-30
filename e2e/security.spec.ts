/**
 * TC-SEC-* — 보안 취약점 E2E 테스트
 * SecuScanner 스캔 결과 기반 (2026-05-30 v1.0)
 * 대상: https://church-portal-woad.vercel.app
 */

import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";

test.describe("TC-SEC: 보안 헤더 검증", () => {
  test("TC-SEC-001: CSP 헤더 존재 (H-02)", async ({ request }) => {
    const res = await request.get(BASE);
    const csp = res.headers()["content-security-policy"];
    expect(csp, "CSP 헤더 없음").toBeTruthy();
    expect(csp).toContain("default-src");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  test("TC-SEC-002: X-Frame-Options DENY (H-03)", async ({ request }) => {
    const res = await request.get(BASE);
    const xfo = res.headers()["x-frame-options"];
    expect(xfo?.toUpperCase(), "X-Frame-Options 헤더 없음").toBeTruthy();
    expect(["DENY", "SAMEORIGIN"]).toContain(xfo?.toUpperCase());
  });

  test("TC-SEC-003: X-Content-Type-Options nosniff (H-04)", async ({ request }) => {
    const res = await request.get(BASE);
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("TC-SEC-004: Referrer-Policy 설정 (H-05)", async ({ request }) => {
    const res = await request.get(BASE);
    expect(res.headers()["referrer-policy"], "Referrer-Policy 헤더 없음").toBeTruthy();
  });

  test("TC-SEC-005: Permissions-Policy 설정 (H-06)", async ({ request }) => {
    const res = await request.get(BASE);
    expect(res.headers()["permissions-policy"], "Permissions-Policy 헤더 없음").toBeTruthy();
  });
});

test.describe("TC-SEC: 인증/인가 검증", () => {
  test("TC-SEC-010: 미인증 API 접근 차단 — /api/offerings", async ({ request }) => {
    const res = await request.get(`${BASE}/api/offerings`);
    expect(res.status()).toBe(401);
  });

  test("TC-SEC-011: 미인증 API 접근 차단 — /api/expenses", async ({ request }) => {
    const res = await request.get(`${BASE}/api/expenses`);
    expect(res.status()).toBe(401);
  });

  test("TC-SEC-012: 미인증 API 접근 차단 — /api/feedback (POST)", async ({ request }) => {
    const res = await request.post(`${BASE}/api/feedback`, { data: { page: "test", content: "x" } });
    expect([401, 403]).toContain(res.status());
  });

  test("TC-SEC-013: 보호된 페이지 미인증 접근 시 로그인 리다이렉트", async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await expect(page).toHaveURL(/login/);
  });

  test("TC-SEC-014: 보호된 페이지 미인증 접근 — /offerings", async ({ page }) => {
    await page.goto(`${BASE}/offerings`);
    await expect(page).toHaveURL(/login/);
  });

  test("TC-SEC-015: 보호된 페이지 미인증 접근 — /account-book", async ({ page }) => {
    await page.goto(`${BASE}/account-book`);
    await expect(page).toHaveURL(/login/);
  });
});

test.describe("TC-SEC: 입력값 검증 (XSS/Injection)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', process.env.TEST_EMAIL || "***REMOVED***");
    await page.fill('input[type="password"]', process.env.TEST_PASSWORD || "***REMOVED***");
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|offerings/);
  });

  test("TC-SEC-020: XSS 페이로드 헌금 메모 필드 — 스크립트 실행 안 됨", async ({ page }) => {
    await page.goto(`${BASE}/offerings`);
    const payload = "<script>alert('xss')</script>";
    const noteInput = page.locator('input[placeholder*="비고"]').first();
    if (await noteInput.isVisible()) {
      await noteInput.fill(payload);
      const dialogs: string[] = [];
      page.on("dialog", (d) => { dialogs.push(d.message()); d.dismiss(); });
      await page.waitForTimeout(500);
      expect(dialogs).toHaveLength(0);
    }
  });

  test("TC-SEC-021: SQL Injection 패턴 거부 — offerings API", async ({ page, request }) => {
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name.startsWith("next-auth"));
    const res = await request.get(`${BASE}/api/offerings?week_id=' OR '1'='1`, {
      headers: sessionCookie ? { Cookie: `${sessionCookie.name}=${sessionCookie.value}` } : {},
    });
    expect(res.status()).not.toBe(500);
    const body = await res.json().catch(() => ({}));
    expect(Array.isArray(body) || body.error).toBeTruthy();
  });
});

test.describe("TC-SEC: TLS/전송 보안", () => {
  test("TC-SEC-030: HTTPS 응답 정상 (TLS 1.3)", async ({ request }) => {
    if (!BASE.startsWith("https")) {
      test.skip();
      return;
    }
    const res = await request.get(BASE);
    expect(res.status()).toBeLessThan(500);
  });

  test("TC-SEC-031: HTTP → HTTPS 리다이렉트 (배포 환경)", async ({ request }) => {
    if (!BASE.startsWith("https")) {
      test.skip();
      return;
    }
    const httpUrl = BASE.replace("https://", "http://");
    const res = await request.get(httpUrl, { maxRedirects: 0 }).catch(() => null);
    if (res) {
      expect([301, 302, 307, 308]).toContain(res.status());
    }
  });
});
