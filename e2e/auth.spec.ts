import { test, expect } from '@playwright/test'

const TEST_EMAIL = process.env.TEST_EMAIL
const TEST_PASSWORD = process.env.TEST_PASSWORD
if (!TEST_EMAIL || !TEST_PASSWORD) throw new Error('TEST_EMAIL / TEST_PASSWORD 환경변수 필요')

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page before each test
    await page.goto('/login')
  })

  test('TC-AUTH-001: 유효한 자격증명으로 로그인 성공', async ({ page }) => {
    // Input email
    await page.locator('input[type="email"]').fill(TEST_EMAIL)

    // Input password
    await page.locator('input[type="password"]').fill(TEST_PASSWORD)

    // Click login button
    await page.locator('button:has-text("로그인")').click()

    // Verify redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    expect(page.url()).toContain('/dashboard')

    // Verify user info is displayed
    const userInfo = page.locator('header, nav, [class*="header"], [class*="nav"]')
    await expect(userInfo).toBeVisible({ timeout: 5000 })

    // Verify logout button is visible
    const logoutBtn = page.locator('button:has-text("로그아웃")')
    await expect(logoutBtn).toBeVisible()
  })

  test('TC-AUTH-002: 잘못된 비밀번호로 로그인 실패', async ({ page }) => {
    // Input email
    await page.locator('input[type="email"]').fill(TEST_EMAIL)

    // Input wrong password
    await page.locator('input[type="password"]').fill('wrongpassword123')

    // Click login button
    await page.locator('button:has-text("로그인")').click()

    // Verify error message
    const errorMsg = page.locator('text=/이메일 또는 비밀번호|잘못되었습니다/')
    await expect(errorMsg).toBeVisible({ timeout: 5000 })

    // Verify still on login page
    expect(page.url()).toContain('/login')
  })

  test('TC-AUTH-003: 존재하지 않는 이메일로 로그인 시도', async ({ page }) => {
    // Input non-existent email
    await page.locator('input[type="email"]').fill('nonexistent@example.com')

    // Input any password
    await page.locator('input[type="password"]').fill('anypassword')

    // Click login button
    await page.locator('button:has-text("로그인")').click()

    // Verify error message
    const errorMsg = page.locator('text=/이메일|찾을 수 없음|존재하지 않음/')
    await expect(errorMsg).toBeVisible({ timeout: 5000 })

    // Verify still on login page
    expect(page.url()).toContain('/login')
  })

  test('TC-AUTH-004: 로그아웃 성공', async ({ page }) => {
    // First login
    await page.locator('input[type="email"]').fill(TEST_EMAIL)
    await page.locator('input[type="password"]').fill(TEST_PASSWORD)
    await page.locator('button:has-text("로그인")').click()

    // Wait for dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 })

    // Click logout button
    const logoutBtn = page.locator('button:has-text("로그아웃")')
    await expect(logoutBtn).toBeVisible()
    await logoutBtn.click()

    // Handle confirmation dialog if exists
    const confirmBtn = page.locator('button:has-text("확인")')
    if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmBtn.click()
    }

    // Verify redirect to login page
    await page.waitForURL('**/login', { timeout: 10000 })
    expect(page.url()).toContain('/login')

    // Verify cannot access dashboard without login
    await page.goto('/dashboard')
    await page.waitForURL('**/login', { timeout: 5000 })
    expect(page.url()).toContain('/login')
  })

  test('TC-AUTH-005: 비인증 사용자의 보호된 페이지 접근 시 로그인 페이지로 리다이렉트', async ({ page }) => {
    // Try to access protected dashboard page directly
    await page.goto('/dashboard')

    // Should redirect to login
    await page.waitForURL('**/login', { timeout: 10000 })
    expect(page.url()).toContain('/login')

    // Verify login form is visible
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible()
  })
})
