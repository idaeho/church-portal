# 꿈꾸는교회 재정관리 포털

Next.js 14 + NeonDB + Vercel로 구축한 교회 재정관리 웹 포털.

## 기능

- 헌금 입력 (엑셀 그리드 + 빠른입력 + 자동분류)
- 지출 입력 (엑셀 그리드 + 계정과목 자동감지)
- 엑셀 일괄 업로드 / 템플릿 다운로드
- 대시보드 (주간 수입/지출 요약)
- 주간결산 보고서 (출력용)
- 관리자 로그인 (단일 계정)
- 피드백 시스템 → NeonDB 저장 → 이메일 알림

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

```bash
cp .env.example .env
# .env 파일 수정: DATABASE_URL, NEXTAUTH_SECRET, GMAIL_USER, GMAIL_APP_PASSWORD
```

### 3. DB 마이그레이션

```bash
npm run db:migrate
```

### 4. 관리자 계정 생성

```bash
ADMIN_EMAIL=admin@your-church.example ADMIN_PASSWORD=your_password npx tsx scripts/setup-admin.ts
```

### 5. 개발 서버 실행

```bash
npm run dev
# http://localhost:3000
```

## 피드백 자동 체크

매일 미처리 피드백을 이메일로 발송:

```bash
# 수동 실행
npm run feedback:check

# crontab 설정 (매일 09:00)
0 9 * * * cd /path/to/church-portal && npx tsx scripts/check-feedback.ts
```

## Vercel 배포

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel --prod
```

Vercel 환경변수 설정 필수:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (= https://your-domain.vercel.app)
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `NOTIFY_EMAIL`

## 엑셀 템플릿

- 헌금: `/api/templates?type=offering`
- 지출: `/api/templates?type=expense`

## 기술 스택

| 항목 | 기술 |
|------|------|
| 프레임워크 | Next.js 14 (App Router) |
| DB | NeonDB (PostgreSQL) |
| 인증 | NextAuth.js v4 |
| 스타일링 | Tailwind CSS |
| 엑셀 | SheetJS (xlsx) |
| 이메일 | nodemailer + Gmail SMTP |
| 배포 | Vercel |
