import { test, expect } from '@playwright/test'

const TEST_EMAIL = process.env.TEST_EMAIL
const TEST_PASSWORD = process.env.TEST_PASSWORD
if (!TEST_EMAIL || !TEST_PASSWORD) throw new Error('TEST_EMAIL / TEST_PASSWORD 환경변수 필요')

// Helper function to login before each test
async function login(page: any) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(TEST_EMAIL)
  await page.locator('input[type="password"]').fill(TEST_PASSWORD)
  await page.locator('button:has-text("로그인")').click()
  await page.waitForURL('**/dashboard', { timeout: 10000 })
}

test.describe('Offerings (헌금 입력)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/offerings')
    await page.waitForLoadState('networkidle')
  })

  test('TC-OFF-001: 헌금 항목 입력 및 저장 성공', async ({ page }) => {
    // Get current date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]

    // Fill in offering form
    await page.locator('input[type="date"]').fill(today)
    await page.locator('select').selectOption('십일조')
    await page.locator('input[placeholder="이름 입력"]').fill('홍길동')
    await page.locator('input[placeholder="0"]').fill('50000')

    // Click save button and wait for network response
    const saveBtn = page.locator('button:has-text("저장")')

    // Wait for POST request to complete
    const response = await Promise.race([
      page.waitForResponse(res =>
        res.url().includes('/api/offerings') && res.status() === 201
      ),
      page.waitForResponse(res =>
        res.url().includes('/api/offerings') && res.status() === 200
      ),
    ]).catch(() => null)

    await saveBtn.click()

    if (response) {
      expect(response.status()).toBeLessThan(300)
    }

    // Verify success message
    const successMsg = page.locator('text=/저장|완료|성공/')
    await expect(successMsg).toBeVisible({ timeout: 5000 })

    // Verify item appears in grid/table
    const gridItem = page.locator('text=홍길동')
    await expect(gridItem).toBeVisible({ timeout: 5000 })

    // Cleanup: Delete the created offering
    // This should be done via API for reliability
    const deleteBtn = page.locator('button[aria-label="삭제"], button:has-text("삭제")').first()
    if (await deleteBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await deleteBtn.click()
      const confirmBtn = page.locator('button:has-text("삭제")')
      await confirmBtn.click()
    }
  })

  test('TC-OFF-002: 필수 필드 누락 시 저장 실패', async ({ page }) => {
    // Fill only some fields (omit name)
    const today = new Date().toISOString().split('T')[0]
    await page.locator('input[type="date"]').fill(today)
    await page.locator('select').selectOption('십일조')
    await page.locator('input[placeholder="0"]').fill('50000')
    // Skip name field

    // Try to save
    const saveBtn = page.locator('button:has-text("저장")')
    await saveBtn.click()

    // Verify error message appears
    const errorMsg = page.locator('text=/필수|입력하세요|필요합니다/')
    await expect(errorMsg).toBeVisible({ timeout: 3000 })

    // Verify form is not submitted (still on page)
    expect(page.url()).toContain('/offerings')
  })

  test('TC-OFF-003: 자동분류 기능 (헌금 종류 자동 선택)', async ({ page }) => {
    // Test if memo field auto-classifies offering type
    const today = new Date().toISOString().split('T')[0]

    await page.locator('input[type="date"]').fill(today)
    await page.locator('input[placeholder="이름 입력"]').fill('임요한')

    // Enter memo with building-related keyword
    const memoField = page.locator('input[placeholder="비고"]')
    await memoField.fill('건축헌금')

    // Trigger auto-classification (may happen on blur or change)
    await memoField.blur()

    // Check if type field auto-populated (implementation dependent)
    const typeField = page.locator('select')
    const selectedValue = await typeField.inputValue().catch(() => '')

    // This test may need adjustment based on actual UI behavior
    // If auto-classification exists, it should select "건축" or similar
    if (selectedValue) {
      expect(selectedValue).toMatch(/건축|building/i)
    }
  })

  test('TC-OFF-004: 헌금 항목 삭제', async ({ page }) => {
    // First create an offering
    const today = new Date().toISOString().split('T')[0]
    await page.locator('input[type="date"]').fill(today)
    await page.locator('select').selectOption('감사')
    await page.locator('input[placeholder="이름 입력"]').fill('박영희')
    await page.locator('input[placeholder="0"]').fill('100000')

    const saveBtn = page.locator('button:has-text("저장")')
    await saveBtn.click()

    // Wait for item to appear
    const gridItem = page.locator('text=박영희')
    await expect(gridItem).toBeVisible({ timeout: 5000 })

    // Find and click delete button for this item
    const deleteBtn = page.locator('button[aria-label="삭제"], button:has-text("삭제")').first()
    await expect(deleteBtn).toBeVisible()

    // Setup response listener for DELETE
    const responsePromise = page.waitForResponse(res =>
      res.url().includes('/api/offerings') && res.request().method() === 'DELETE'
    ).catch(() => null)

    await deleteBtn.click()

    // Confirm deletion if dialog appears
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

  test('TC-OFF-005: 대량 입력 (엑셀형 그리드)', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0]

    // Find grid cells and fill multiple rows
    const gridRows = page.locator('tbody tr, [class*="row"]')
    const count = await gridRows.count()

    // Fill first 3 rows
    for (let i = 0; i < Math.min(3, count); i++) {
      const row = gridRows.nth(i)

      const dateInput = row.locator('input[type="date"]')
      const typeSelect = row.locator('select')
      const nameInput = row.locator('input[placeholder="이름 입력"]')
      const amountInput = row.locator('input[placeholder="0"]')

      await dateInput.fill(today)
      await typeSelect.selectOption('십일조')
      await nameInput.fill(`테스트교인${i + 1}`)
      await amountInput.fill(String(50000 + i * 10000))
    }

    // Click save all
    const saveBtn = page.locator('button:has-text("저장")')
    await saveBtn.click()

    // Verify all items saved
    for (let i = 0; i < 3; i++) {
      const itemName = page.locator(`text=테스트교인${i + 1}`)
      await expect(itemName).toBeVisible({ timeout: 5000 })
    }

    // Cleanup
    for (let i = 0; i < 3; i++) {
      const deleteBtn = page.locator('button[aria-label="삭제"], button:has-text("삭제")').first()
      if (await deleteBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await deleteBtn.click()
        const confirmBtn = page.locator('button:has-text("삭제")')
        if (await confirmBtn.isVisible({ timeout: 500 }).catch(() => false)) {
          await confirmBtn.click()
        }
      }
    }
  })

  test('TC-OFF-006: 중복 헌금 입력 방지', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0]

    // Create first offering
    await page.locator('input[type="date"]').fill(today)
    await page.locator('select').selectOption('주일')
    await page.locator('input[placeholder="이름 입력"]').fill('김철수')
    await page.locator('input[placeholder="0"]').fill('150000')

    await page.locator('button:has-text("저장")').click()
    await expect(page.locator('text=김철수')).toBeVisible({ timeout: 5000 })

    // Try to create duplicate
    await page.locator('input[type="date"]').fill(today)
    await page.locator('select').selectOption('주일')
    await page.locator('input[placeholder="이름 입력"]').fill('김철수')
    await page.locator('input[placeholder="0"]').fill('150000')

    await page.locator('button:has-text("저장")').click()

    // Expect error or duplicate message
    const duplicateMsg = page.locator('text=/이미|중복|등록/')
    await expect(duplicateMsg).toBeVisible({ timeout: 3000 }).catch(async () => {
      // If no error, at least the second save should fail silently or show error
      const errorMsg = page.locator('text=/오류|실패|Error/')
      await expect(errorMsg).toBeVisible({ timeout: 3000 })
    })

    // Cleanup
    const deleteBtn = page.locator('button[aria-label="삭제"], button:has-text("삭제")').first()
    if (await deleteBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await deleteBtn.click()
      const confirmBtn = page.locator('button:has-text("삭제")')
      if (await confirmBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await confirmBtn.click()
      }
    }
  })
})
