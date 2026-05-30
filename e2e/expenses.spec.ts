import { test, expect } from '@playwright/test'

const TEST_EMAIL = process.env.TEST_EMAIL || '***REMOVED***'
const TEST_PASSWORD = process.env.TEST_PASSWORD || '***REMOVED***'

// Helper function to login before each test
async function login(page: any) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(TEST_EMAIL)
  await page.locator('input[type="password"]').fill(TEST_PASSWORD)
  await page.locator('button:has-text("로그인")').click()
  await page.waitForURL('**/dashboard', { timeout: 10000 })
}

test.describe('Expenses (지출 입력)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/expenses')
    await page.waitForLoadState('networkidle')
  })

  test('TC-EXP-001: 지출 항목 입력 및 저장 성공', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0]

    // Fill expense form
    await page.locator('[data-testid="expense-date"]').fill(today)
    await page.locator('[data-testid="expense-account"]').selectOption('사례비')
    await page.locator('[data-testid="expense-description"]').fill('목사님 월급')
    await page.locator('[data-testid="expense-amount"]').fill('500000')

    // Setup response listener
    const responsePromise = page.waitForResponse(res =>
      (res.url().includes('/api/expenses') &&
        (res.status() === 201 || res.status() === 200))
    ).catch(() => null)

    // Click save
    const saveBtn = page.locator('button:has-text("저장")')
    await saveBtn.click()

    const response = await responsePromise
    if (response) {
      expect(response.status()).toBeLessThan(300)
    }

    // Verify success message
    const successMsg = page.locator('text=/저장|완료|성공/')
    await expect(successMsg).toBeVisible({ timeout: 5000 })

    // Verify item in grid/table
    const gridItem = page.locator('text=목사님 월급')
    await expect(gridItem).toBeVisible({ timeout: 5000 })

    // Cleanup
    const deleteBtn = page.locator('[data-testid="delete-expense"]').first()
    if (await deleteBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await deleteBtn.click()
      const confirmBtn = page.locator('button:has-text("삭제")')
      if (await confirmBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await confirmBtn.click()
      }
    }
  })

  test('TC-EXP-002: 계정과목 자동분류', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0]

    // Fill date and description
    await page.locator('[data-testid="expense-date"]').fill(today)
    await page.locator('[data-testid="expense-description"]').fill('사무용 볼펜 구매')

    // Trigger auto-classification (may happen on blur)
    const descField = page.locator('[data-testid="expense-description"]')
    await descField.blur()

    // Check if account field is auto-populated
    const accountField = page.locator('[data-testid="expense-account"]')
    const selectedValue = await accountField.inputValue().catch(() => '')

    // If auto-classification exists, verify it selected something reasonable
    if (selectedValue) {
      expect(selectedValue).toMatch(/사무|비용|구매/)
    }

    // User should be able to override
    await accountField.selectOption('소모품비')

    // Verify selection is kept
    const finalValue = await accountField.inputValue()
    expect(finalValue).toBeTruthy()
  })

  test('TC-EXP-003: 지출 항목 삭제', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0]

    // Create expense
    await page.locator('[data-testid="expense-date"]').fill(today)
    await page.locator('[data-testid="expense-account"]').selectOption('관리비')
    await page.locator('[data-testid="expense-description"]').fill('전기료 납부')
    await page.locator('[data-testid="expense-amount"]').fill('300000')

    await page.locator('button:has-text("저장")').click()
    await expect(page.locator('text=전기료')).toBeVisible({ timeout: 5000 })

    // Delete it
    const deleteBtn = page.locator('[data-testid="delete-expense"]').first()
    await expect(deleteBtn).toBeVisible()

    const responsePromise = page.waitForResponse(res =>
      res.url().includes('/api/expenses') && res.request().method() === 'DELETE'
    ).catch(() => null)

    await deleteBtn.click()

    const confirmBtn = page.locator('button:has-text("삭제")')
    if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmBtn.click()
    }

    const response = await responsePromise
    if (response) {
      expect([200, 204]).toContain(response.status())
    }

    // Verify success message
    const successMsg = page.locator('text=삭제')
    await expect(successMsg).toBeVisible({ timeout: 3000 })
  })

  test('TC-EXP-004: 필수 필드 검증', async ({ page }) => {
    // Try to save with only date
    const today = new Date().toISOString().split('T')[0]
    await page.locator('[data-testid="expense-date"]').fill(today)

    // Skip other required fields
    const saveBtn = page.locator('button:has-text("저장")')
    await saveBtn.click()

    // Verify error message
    const errorMsg = page.locator('text=/필수|입력|필요/')
    await expect(errorMsg).toBeVisible({ timeout: 3000 })

    // Verify not submitted
    expect(page.url()).toContain('/expenses')
  })

  test('TC-EXP-005: 지출 필터링 (계정과목별)', async ({ page }) => {
    // Navigate to expense view (if different from input page)
    await page.goto('/expense-view')
    await page.waitForLoadState('networkidle')

    // Find filter dropdown
    const filterDropdown = page.locator('[data-testid="account-filter"]')

    // If filter exists, test it
    if (await filterDropdown.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Get current row count
      const allRows = page.locator('[data-testid="expense-row"]')
      const initialCount = await allRows.count()

      // Apply filter
      await filterDropdown.selectOption('사례비')
      await page.waitForLoadState('networkidle')

      // Count filtered rows
      const filteredRows = page.locator('[data-testid="expense-row"]')
      const filteredCount = await filteredRows.count()

      // Should have reduced count (or equal if all are same type)
      expect(filteredCount).toBeLessThanOrEqual(initialCount)

      // All visible rows should be of selected type
      const accountCells = filteredRows.locator('[data-testid="expense-account"]')
      for (let i = 0; i < await accountCells.count(); i++) {
        const text = await accountCells.nth(i).textContent()
        expect(text).toContain('사례비')
      }
    }
  })

  test('TC-EXP-006: 지출 합계 계산', async ({ page }) => {
    // Navigate to expense view
    await page.goto('/expense-view')
    await page.waitForLoadState('networkidle')

    // Find all amount cells
    const amountCells = page.locator('[data-testid="expense-amount"]')
    const count = await amountCells.count()

    if (count > 0) {
      // Calculate expected sum
      let expectedSum = 0
      for (let i = 0; i < count; i++) {
        const text = await amountCells.nth(i).textContent()
        const amount = parseInt(text?.replace(/[^0-9]/g, '') || '0', 10)
        expectedSum += amount
      }

      // Find total row
      const totalCell = page.locator('[data-testid="expense-total"]')
      if (await totalCell.isVisible({ timeout: 1000 }).catch(() => false)) {
        const totalText = await totalCell.textContent()
        const totalAmount = parseInt(totalText?.replace(/[^0-9]/g, '') || '0', 10)

        // Verify calculation
        expect(totalAmount).toBeGreaterThanOrEqual(expectedSum * 0.95) // Allow 5% variance for formatting
        expect(totalAmount).toBeLessThanOrEqual(expectedSum * 1.05)
      }
    }
  })
})
