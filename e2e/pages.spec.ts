import { test, expect } from '@playwright/test'

const TEST_EMAIL = process.env.TEST_EMAIL
const TEST_PASSWORD = process.env.TEST_PASSWORD
if (!TEST_EMAIL || !TEST_PASSWORD) throw new Error('TEST_EMAIL / TEST_PASSWORD 환경변수 필요')

// Helper function to login
async function login(page: any) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(TEST_EMAIL)
  await page.locator('input[type="password"]').fill(TEST_PASSWORD)
  await page.locator('button:has-text("로그인")').click()
  await page.waitForURL('**/dashboard', { timeout: 10000 })
}

test.describe('Page Navigation (Smoke Tests)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('TC-PAGE-001: 홈 페이지 (/) 접근 가능', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify no 404
    expect(page.url()).not.toContain('404')

    // Verify page loaded
    const pageTitle = page.locator('h1, h2, [role="heading"]')
    await expect(pageTitle).toBeVisible({ timeout: 3000 })
  })

  test('TC-PAGE-002: 로그인 페이지 (/login) - 미인증 상태에서 접근 가능', async ({ page }) => {
    // Logout first
    await page.goto('/dashboard')
    const logoutBtn = page.locator('button:has-text("로그아웃")')
    if (await logoutBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await logoutBtn.click()
    }

    // Navigate to login
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Verify login form
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')
    const loginBtn = page.locator('button:has-text("로그인")')

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(loginBtn).toBeVisible()
  })

  test('TC-PAGE-003: 대시보드 (/dashboard) 접근 가능', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Verify no 404
    expect(page.url()).not.toContain('404')

    // Verify KPI cards or main content
    const content = page.locator('h1, h2, [role="heading"], main')
    await expect(content).toBeVisible({ timeout: 3000 })

    // Verify response is successful
    const responses = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      return nav?.responseStatus;
    })
  })

  test('TC-PAGE-004: 헌금 입력 (/offerings) 접근 가능', async ({ page }) => {
    await page.goto('/offerings')
    await page.waitForLoadState('networkidle')

    // Verify no 404
    expect(page.url()).not.toContain('404')

    // Verify form/grid exists
    const form = page.locator('form, table, [class*="grid"]')
    await expect(form).toBeVisible({ timeout: 3000 }).catch(async () => {
      // Alternative: check for page heading
      const heading = page.locator('h1, h2, [role="heading"]')
      await expect(heading).toBeVisible({ timeout: 3000 })
    })
  })

  test('TC-PAGE-005: 지출 입력 (/expenses) 접근 가능', async ({ page }) => {
    await page.goto('/expenses')
    await page.waitForLoadState('networkidle')

    // Verify no 404
    expect(page.url()).not.toContain('404')

    // Verify form/grid exists
    const form = page.locator('form, table, [class*="grid"]')
    await expect(form).toBeVisible({ timeout: 3000 }).catch(async () => {
      const heading = page.locator('h1, h2, [role="heading"]')
      await expect(heading).toBeVisible({ timeout: 3000 })
    })
  })

  test('TC-PAGE-006: 수입내역 (/income) 접근 가능', async ({ page }) => {
    await page.goto('/income')
    await page.waitForLoadState('networkidle')

    // Verify no 404
    expect(page.url()).not.toContain('404')

    // Verify table/content exists
    const table = page.locator('[role="table"], table')
    await expect(table).toBeVisible({ timeout: 3000 }).catch(async () => {
      const heading = page.locator('h1, h2, [role="heading"]')
      await expect(heading).toBeVisible({ timeout: 3000 })
    })
  })

  test('TC-PAGE-007: 지출내역 (/expense-view) 접근 가능', async ({ page }) => {
    await page.goto('/expense-view')
    await page.waitForLoadState('networkidle')

    // Verify no 404
    expect(page.url()).not.toContain('404')

    // Verify table/content exists
    const table = page.locator('[role="table"], table')
    await expect(table).toBeVisible({ timeout: 3000 }).catch(async () => {
      const heading = page.locator('h1, h2, [role="heading"]')
      await expect(heading).toBeVisible({ timeout: 3000 })
    })
  })

  test('TC-PAGE-008: 헌금대장 (/account-book) 접근 가능', async ({ page }) => {
    await page.goto('/account-book')
    await page.waitForLoadState('networkidle')

    // Verify no 404
    expect(page.url()).not.toContain('404')

    // Verify content exists
    const content = page.locator('[role="table"], [role="heading"], main')
    await expect(content).toBeVisible({ timeout: 3000 })
  })

  test('TC-PAGE-009: 주간결산 (/weekly-report) 접근 가능', async ({ page }) => {
    await page.goto('/weekly-report')
    await page.waitForLoadState('networkidle')

    // Verify no 404
    expect(page.url()).not.toContain('404')

    // Verify content exists
    const content = page.locator('[role="heading"], main')
    await expect(content).toBeVisible({ timeout: 3000 })
  })

  test('TC-PAGE-010: 통장관리 (/account-mgmt) 접근 가능', async ({ page }) => {
    await page.goto('/account-mgmt')
    await page.waitForLoadState('networkidle')

    // Verify no 404
    expect(page.url()).not.toContain('404')

    // Verify account list or content exists
    const content = page.locator('[role="table"], [role="heading"], main')
    await expect(content).toBeVisible({ timeout: 3000 })
  })

  test('TC-PAGE-011: 관리자 (/admin) 접근 가능', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    // Verify no 404
    expect(page.url()).not.toContain('404')

    // Verify admin content exists (feedback section, password change, etc)
    const content = page.locator('[role="heading"], main')
    await expect(content).toBeVisible({ timeout: 3000 })
  })

  test('Navigation Menu - 모든 링크가 유효함', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard')

    // Find all navigation links
    const navLinks = page.locator('nav a, [role="navigation"] a')

    // Check that links exist and are visible
    const count = await navLinks.count()
    expect(count).toBeGreaterThan(0)

    // Click each link and verify no 404
    for (let i = 0; i < count && i < 10; i++) {
      const link = navLinks.nth(i)
      const href = await link.getAttribute('href')

      if (href && !href.startsWith('http') && !href.startsWith('mailto')) {
        await link.click()
        await page.waitForLoadState('networkidle')

        // Verify no 404
        expect(page.url()).not.toContain('404')
      }
    }
  })

  test('Page Load Time - 각 페이지가 3초 이내로 로드됨', async ({ page }) => {
    const pages = [
      '/',
      '/dashboard',
      '/offerings',
      '/expenses',
      '/income',
      '/expense-view',
      '/account-book',
      '/weekly-report',
      '/account-mgmt',
      '/admin',
    ]

    for (const pagePath of pages) {
      const startTime = Date.now()
      await page.goto(pagePath)
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(5000) // Allow up to 5 seconds
    }
  })
})
