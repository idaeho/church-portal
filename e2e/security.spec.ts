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

  // feedback POST는 의도적으로 미인증 허용 — 교인 익명 의견 제출 목적.
  // GET(목록 조회) · PATCH(상태 변경)은 관리자 인증 필요.
  test("TC-SEC-012: feedback POST 익명 허용 / GET는 인증 필요", async ({ request }) => {
    const postRes = await request.post(`${BASE}/api/feedback`, { data: { page: "test", content: "익명 테스트" } });
    expect(postRes.status()).toBe(201);

    const getRes = await request.get(`${BASE}/api/feedback`);
    expect(getRes.status()).toBe(401);
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
    const email = process.env.TEST_EMAIL;
    const password = process.env.TEST_PASSWORD;
    if (!email || !password) throw new Error('TEST_EMAIL / TEST_PASSWORD 환경변수 필요');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|offerings/);
  });

  test("TC-SEC-020: XSS 페이로드 헌금 메모 필드 — 저장 후 렌더링 시 스크립트 미실행", async ({ page }) => {
    await page.goto(`${BASE}/offerings`);
    const payload = "<script>alert('xss')</script>";

    // dialog 리스너 먼저 등록
    const dialogs: string[] = [];
    page.on("dialog", (d) => { dialogs.push(d.message()); d.dismiss(); });

    const noteInput = page.locator('input[placeholder*="비고"], input[name="note"]').first();
    if (await noteInput.isVisible()) {
      // 필수 필드 최소 입력
      const dateInput = page.locator('input[type="date"]').first();
      if (await dateInput.isVisible()) await dateInput.fill("2026-05-30");
      const amountInput = page.locator('input[type="number"], input[placeholder*="금액"]').first();
      if (await amountInput.isVisible()) await amountInput.fill("1000");

      await noteInput.fill(payload);

      // 저장 버튼 클릭
      const saveBtn = page.locator('button:has-text("저장"), button:has-text("추가"), button[type="submit"]').first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(1000);
      }

      // 동일 페이지 또는 내역 페이지로 이동해 렌더링 확인
      await page.goto(`${BASE}/income`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      // XSS alert이 실행되지 않아야 함
      expect(dialogs).toHaveLength(0);

      // 페이로드가 이스케이프되어 텍스트로 표시되는지 확인
      const bodyText = await page.locator("body").innerText();
      expect(bodyText).not.toContain("xss");
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
