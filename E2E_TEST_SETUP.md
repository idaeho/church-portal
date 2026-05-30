# E2E 테스트 설정 및 실행 가이드

## 빠른 시작

### 1. Playwright 설치

```bash
npm install
npx playwright install
```

### 2. 환경 변수 설정

```bash
# 프로젝트 루트에 .env.local 파일 생성 (또는 .env.test 사용)
cp .env.test .env.local

# 다음 변수들 확인/수정:
# PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000
# TEST_EMAIL=idaeho@gmail.com
# TEST_PASSWORD=DreamChurch@#$
```

### 3. 개발 서버 시작

```bash
npm run dev
# 또는 다른 터미널에서 테스트 실행
```

### 4. 테스트 실행

```bash
# 모든 테스트 실행
npm run test:e2e

# 특정 파일 테스트
npm run test:e2e -- auth.spec.ts

# UI 모드 (시각적 디버깅)
npm run test:e2e -- --ui

# 헤드풀 모드 (브라우저 보이기)
npm run test:e2e -- --headed

# 디버그 모드
npm run test:e2e -- --debug

# 특정 브라우저만 테스트
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
npm run test:e2e -- --project=webkit
```

## 고급 사용법

### 테스트 보고서 보기

```bash
# HTML 리포트 생성 및 열기
npx playwright show-report
```

### 특정 테스트만 실행

```bash
# 이름으로 필터링
npm run test:e2e -- --grep "로그인"

# 파일과 테스트 이름
npm run test:e2e -- auth.spec.ts -g "TC-AUTH-001"
```

### Flaky 테스트 검증

```bash
# 각 테스트를 5회씩 반복 실행
npm run test:e2e -- --repeat-each=5

# 실패할 때까지 반복
npm run test:e2e -- --repeat-each=10
```

### 트레이싱 활성화

```bash
# 모든 테스트에서 트레이스 수집
npm run test:e2e -- --trace on

# 실패할 때만 트레이스 수집 (기본값)
npm run test:e2e -- --trace on-first-retry
```

## CI/CD 통합

### GitHub Actions

저장소에 GitHub Secrets 설정:

```bash
# Settings > Secrets and variables > Actions > New repository secret
TEST_EMAIL=idaeho@gmail.com
TEST_PASSWORD=DreamChurch@#$
DATABASE_URL=your_db_url
NEXTAUTH_SECRET=your_secret
```

CI에서는 자동으로 다음을 실행합니다:
- 모든 E2E 테스트 (3개 브라우저: Chromium, Firefox, WebKit)
- 아티팩트 수집 (스크린샷, 비디오, 트레이스)
- PR에 결과 댓글 작성

### 로컬에서 CI 환경 재현

```bash
# GitHub Actions 워크플로우와 동일한 환경에서 테스트
docker run --rm -v $(pwd):/workspace -w /workspace \
  mcr.microsoft.com/playwright:v1.40.0-jammy \
  bash -c "npm ci && npx playwright install && npm run test:e2e"
```

## 테스트 파일 구조

```
e2e/
├── auth.spec.ts          # 인증 테스트 (로그인/로그아웃)
├── offerings.spec.ts     # 헌금 입력 테스트
├── expenses.spec.ts      # 지출 입력 테스트
├── pages.spec.ts         # 페이지 네비게이션 (smoke test)
└── feedback.spec.ts      # 피드백 관리 테스트

test-results/            # 테스트 결과 (git ignored)
├── results.json         # JSON 형식의 결과
├── junit.xml            # JUnit XML 형식
├── report/              # HTML 리포트
└── artifacts/           # 스크린샷, 비디오, 트레이스
```

## 주요 설정 파일

### playwright.config.ts

```typescript
// 기본 설정
- baseURL: http://localhost:3000
- timeout: 30초 (테스트), 10초 (assertion)
- retries: CI에서 2회, 로컬에서 0회
- workers: 병렬 실행 (로컬 기본값)

// 아티팩트
- trace: on-first-retry (실패 시만 수집)
- screenshot: only-on-failure
- video: retain-on-failure
```

### .env.test

테스트 환경 변수 (`.env.local`로 복사하여 사용)

## 일반적인 문제 해결

### 1. "Target page, context or browser has been closed" 에러

**원인**: 페이지 네비게이션 후 네트워크 완료 대기 부족

**해결책**:
```typescript
await page.goto(url)
await page.waitForLoadState('networkidle')
```

### 2. "Timeout waiting for locator" 에러

**원인**: 요소가 DOM에 없거나 렌더링되지 않음

**해결책**:
```typescript
// 1. 타임아웃 증가
await expect(element).toBeVisible({ timeout: 10000 })

// 2. 더 구체적인 선택자 사용
await page.locator('[data-testid="specific-id"]')

// 3. 페이지 로드 대기
await page.waitForLoadState('networkidle')
```

### 3. "Browser is not installed" 에러

**해결책**:
```bash
npx playwright install chromium firefox webkit
# 또는 모든 브라우저 및 의존성
npx playwright install --with-deps
```

### 4. 테스트가 특정 브라우저에서만 실패

**해결책**:
```typescript
test.skip(browserName === 'webkit', 'Known issue on Safari')
test('특정 테스트', async ({ page, browserName }) => {
  if (browserName === 'firefox') {
    // Firefox 특정 처리
  }
})
```

### 5. "Element is not visible" 에러

**원인**: 요소가 화면 밖에 있거나 다른 요소로 가려짐

**해결책**:
```typescript
// 스크롤하여 요소를 화면에 가져오기
await element.scrollIntoViewIfNeeded()
await element.click()

// 또는 page 상태 확인
await page.waitForLoadState('networkidle')
```

## 모범 사례

### 1. 데이터 격리

```typescript
// 테스트마다 고유한 데이터 사용
const timestamp = Date.now()
const uniqueName = `Test User ${timestamp}`
```

### 2. 자동 대기 활용

```typescript
// 좋음: auto-waiting 포함
await page.locator('button').click()

// 피해야 할 것: 수동 대기
await page.waitForTimeout(1000)
```

### 3. data-testid 사용

```typescript
// 좋음: 변경되지 않는 속성
await page.locator('[data-testid="submit-button"]').click()

// 피해야 할 것: 불안정한 CSS 선택자
await page.locator('.form-controls > div:nth-child(3) > button')
```

### 4. 명확한 테스트명

```typescript
// 좋음: 무엇을 테스트하는지 명확
test('TC-AUTH-001: 유효한 자격증명으로 로그인 성공', async ({ page }) => {})

// 피해야 할 것: 모호한 이름
test('login test', async ({ page }) => {})
```

## 추가 리소스

- [Playwright 공식 문서](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [디버깅 가이드](https://playwright.dev/docs/debug)
- [테스트 계획서](./docs/E2E_TEST_PLAN.md)

## 지원

문제가 있으면:

1. 테스트를 `--debug` 모드로 실행
2. HTML 리포트와 비디오 확인
3. 스크린샷에서 실제 상태 확인
4. GitHub Issues에 스크린샷과 함께 보고

---

**마지막 업데이트**: 2026-05-30
