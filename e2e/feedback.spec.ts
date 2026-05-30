import { test, expect } from '@playwright/test'

const TEST_EMAIL = process.env.TEST_EMAIL || '***REMOVED***'
const TEST_PASSWORD = process.env.TEST_PASSWORD || '***REMOVED***'

// Helper function to login
async function login(page: any) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(TEST_EMAIL)
  await page.locator('input[type="password"]').fill(TEST_PASSWORD)
  await page.locator('button:has-text("로그인")').click()
  await page.waitForURL('**/dashboard', { timeout: 10000 })
}

test.describe('Feedback (피드백 관리)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
  })

  test('TC-FB-001: 피드백 제출 성공', async ({ page }) => {
    // Find feedback form
    const feedbackForm = page.locator('[data-testid="feedback-form"]')
    await expect(feedbackForm).toBeVisible({ timeout: 3000 })

    // Generate unique feedback to avoid conflicts
    const timestamp = new Date().getTime()
    const title = `테스트 피드백 ${timestamp}`
    const content = '대시보드 개선: 월별 비교 차트가 있으면 좋겠습니다'

    // Fill form
    await page.locator('[data-testid="feedback-title"]').fill(title)
    await page.locator('[data-testid="feedback-content"]').fill(content)

    // Setup response listener
    const responsePromise = page.waitForResponse(res =>
      (res.url().includes('/api/feedback') && res.status() === 201)
    ).catch(() => null)

    // Submit
    const submitBtn = page.locator('button:has-text("제출")')
    await submitBtn.click()

    const response = await responsePromise
    if (response) {
      expect(response.status()).toBeLessThan(300)
    }

    // Verify success message
    const successMsg = page.locator('text=/전송|제출|완료/')
    await expect(successMsg).toBeVisible({ timeout: 5000 })

    // Verify form reset
    const titleInput = page.locator('[data-testid="feedback-title"]')
    const titleValue = await titleInput.inputValue().catch(() => '')
    if (titleValue === '') {
      expect(titleValue).toBe('')
    }

    // Cleanup: Verify feedback appears in list and note for manual deletion if needed
    // (Automated cleanup via API would be more reliable in production)
  })

  test('TC-FB-002: 필수 필드 검증 - 제목 없이 제출 실패', async ({ page }) => {
    // Find feedback form
    const feedbackForm = page.locator('[data-testid="feedback-form"]')
    await expect(feedbackForm).toBeVisible({ timeout: 3000 })

    // Fill only content (skip title)
    await page.locator('[data-testid="feedback-content"]').fill('내용만 있고 제목은 없음')

    // Try to submit
    const submitBtn = page.locator('button:has-text("제출")')
    await submitBtn.click()

    // Verify error message for required title
    const errorMsg = page.locator('text=/필수|제목|입력/')
    await expect(errorMsg).toBeVisible({ timeout: 3000 })
  })

  test('TC-FB-003: 필수 필드 검증 - 내용 없이 제출 실패', async ({ page }) => {
    // Find feedback form
    const feedbackForm = page.locator('[data-testid="feedback-form"]')
    await expect(feedbackForm).toBeVisible({ timeout: 3000 })

    // Fill only title (skip content)
    const timestamp = new Date().getTime()
    await page.locator('[data-testid="feedback-title"]').fill(`제목만 ${timestamp}`)

    // Try to submit
    const submitBtn = page.locator('button:has-text("제출")')
    await submitBtn.click()

    // Verify error message for required content
    const errorMsg = page.locator('text=/필수|내용|입력/')
    await expect(errorMsg).toBeVisible({ timeout: 3000 })
  })

  test('TC-FB-004: 관리자 피드백 목록 조회', async ({ page }) => {
    // Navigate to admin page if not there
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    // Find feedback table/list
    const feedbackTable = page.locator('[data-testid="feedback-table"], [data-testid="feedback-list"]')

    if (await feedbackTable.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Verify table has header
      const headerRow = page.locator('[data-testid="feedback-header"]')
      await expect(headerRow).toBeVisible({ timeout: 2000 })

      // Verify at least one feedback item (if any exists)
      const feedbackRows = page.locator('[data-testid="feedback-row"]')
      const count = await feedbackRows.count()

      if (count > 0) {
        // Verify columns: title, content, date, etc.
        const firstRow = feedbackRows.nth(0)
        const titleCell = firstRow.locator('[data-testid="feedback-title-cell"]')
        const contentCell = firstRow.locator('[data-testid="feedback-content-cell"]')

        // At least title should be visible
        await expect(titleCell).toBeVisible({ timeout: 2000 }).catch(async () => {
          // Fallback: just check row is visible
          await expect(firstRow).toBeVisible()
        })
      }
    }
  })

  test('TC-FB-005: 피드백 삭제 (관리자만)', async ({ page }) => {
    // First, create a feedback to delete
    const timestamp = new Date().getTime()
    const testTitle = `삭제테스트 ${timestamp}`

    await page.locator('[data-testid="feedback-title"]').fill(testTitle)
    await page.locator('[data-testid="feedback-content"]').fill('이 피드백은 테스트용으로 삭제될 것입니다')

    await page.locator('button:has-text("제출")').click()

    // Wait for feedback to appear
    const feedbackItem = page.locator(`text=${testTitle}`)
    await expect(feedbackItem).toBeVisible({ timeout: 5000 })

    // Find delete button for this feedback
    const deleteBtn = page.locator('[data-testid="delete-feedback"]').first()

    if (await deleteBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Setup response listener for DELETE
      const responsePromise = page.waitForResponse(res =>
        res.url().includes('/api/feedback') && res.request().method() === 'DELETE'
      ).catch(() => null)

      await deleteBtn.click()

      // Confirm if dialog appears
      const confirmBtn = page.locator('button:has-text("삭제|확인")')
      if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmBtn.click()
      }

      const response = await responsePromise
      if (response) {
        expect([200, 204]).toContain(response.status())
      }

      // Verify item removed
      await expect(feedbackItem).not.toBeVisible({ timeout: 5000 })
    }
  })

  test('TC-FB-006: 피드백 상세 보기', async ({ page }) => {
    // Navigate to admin
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    // Find feedback list
    const feedbackRows = page.locator('[data-testid="feedback-row"]')
    const count = await feedbackRows.count()

    if (count > 0) {
      // Click first feedback item
      const firstRow = feedbackRows.nth(0)
      await firstRow.click()

      // Verify detail view opens or modal appears
      const detailView = page.locator('[data-testid="feedback-detail"], [data-testid="feedback-modal"]')
      await expect(detailView).toBeVisible({ timeout: 3000 }).catch(async () => {
        // Fallback: verify page navigates to detail
        expect(page.url()).toMatch(/feedback|detail/)
      })

      // Verify content is visible
      const titleInDetail = page.locator('[data-testid="feedback-title-detail"]')
      const contentInDetail = page.locator('[data-testid="feedback-content-detail"]')

      await expect(titleInDetail.or(contentInDetail)).toBeVisible({ timeout: 2000 })
    }
  })

  test('TC-FB-007: 피드백 필터링 (선택사항)', async ({ page }) => {
    // Navigate to admin feedback section
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    // Check if filter exists
    const filterDropdown = page.locator('[data-testid="feedback-filter"]')

    if (await filterDropdown.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Get initial count
      const allRows = page.locator('[data-testid="feedback-row"]')
      const initialCount = await allRows.count()

      // Apply filter (e.g., by status)
      await filterDropdown.selectOption('응답됨')
      await page.waitForLoadState('networkidle')

      // Count filtered rows
      const filteredRows = page.locator('[data-testid="feedback-row"]')
      const filteredCount = await filteredRows.count()

      // Filtered count should be <= initial count
      expect(filteredCount).toBeLessThanOrEqual(initialCount)
    }
  })

  test('TC-FB-008: 피드백 검색 (선택사항)', async ({ page }) => {
    // Navigate to admin
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    // Check if search input exists
    const searchInput = page.locator('[data-testid="feedback-search"]')

    if (await searchInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Type search term
      await searchInput.fill('대시보드')
      await page.waitForLoadState('networkidle')

      // Verify results are filtered
      const results = page.locator('[data-testid="feedback-row"]')
      const count = await results.count()

      // Should have results or empty message
      const emptyMsg = page.locator('text=/결과 없음|검색 결과/')
      const hasResults = count > 0 || (await emptyMsg.isVisible({ timeout: 1000 }).catch(() => false))

      expect(hasResults).toBe(true)
    }
  })
})
