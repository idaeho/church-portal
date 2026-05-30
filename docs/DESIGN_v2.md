# 꿈꾸는교회 재정관리 포털 — 설계서 v2.0

> 버전: v2.0 | 작성일: 2026-05-30 | 변경: 개인정보 암호화 설계 추가, 보안헤더 조치 반영

---

## 1. 시스템 개요

### 1.1 목적
교회 재정 데이터(헌금·지출) 웹 포털 전환. Excel 기반 운영을 DB 기반으로 전환하여 이력 관리, 검색, 보고서 자동화를 실현.

### 1.2 아키텍처

```
[브라우저] → [Vercel Edge / Next.js 14 App Router]
                    ↓
             [NextAuth.js v4]  ← JWT 세션
                    ↓
             [NeonDB PostgreSQL (Serverless)]
```

**기술 스택**
| 계층 | 기술 |
|------|------|
| Frontend | Next.js 14 App Router, React 18, Tailwind CSS |
| Auth | NextAuth.js v4, bcrypt(12 rounds) |
| DB | NeonDB (@neondatabase/serverless) |
| 배포 | Vercel (Production) |
| 이메일 알림 | gog CLI (로컬 Mac, 크론탭) |
| 엑셀 처리 | SheetJS (xlsx) |

---

## 2. 데이터베이스 스키마 (현재 v1)

### 2.1 테이블 목록
| 테이블 | 목적 | PII 여부 |
|--------|------|---------|
| `users` | 관리자 계정 | ✅ email |
| `offerings` | 헌금 내역 | ✅ **member_name** |
| `expenses` | 지출 내역 | ❌ |
| `members` | 교인 목록 | ✅ **name** |
| `feedback` | 사용자 피드백 | ✅ **submitter** |
| `weekly_reports` | 주간 요약 | ❌ |

### 2.2 PII 필드 현황
```
offerings.member_name  VARCHAR(100)  — 교인 실명 (현재: 평문)
members.name           VARCHAR(100)  — 교인 실명 (현재: 평문)
feedback.submitter     VARCHAR(100)  — 작성자 이름 (현재: 평문)
users.email            VARCHAR(255)  — 이메일 (현재: 평문)
```

---

## 3. 개인정보(PII) 암호화 설계 (v2 신규)

### 3.1 암호화 전략

**방식**: 앱 레벨 AES-256-GCM (Node.js `crypto` 내장 모듈)

**근거**:
- PostgreSQL `pgcrypto` 보다 앱 레벨이 키 관리·마이그레이션 유연성 높음
- NeonDB Serverless 환경에서 함수 오버헤드 없음
- 검색 요건: `LIKE '%이름%'` 불필요 (정확한 이름으로 조회) → 결정론적 암호화 허용

**암호화 대상**:
| 필드 | 암호화 방식 | 검색 방식 |
|------|-----------|---------|
| `offerings.member_name` | AES-256-GCM | 이름 입력 → 암호화 후 저장/검색 |
| `members.name` | AES-256-GCM | 정확한 이름 조회만 허용 |
| `feedback.submitter` | AES-256-GCM | 조회 불필요 (단방향 저장) |

**암호화 제외**:
- `users.email` — NextAuth 내부 조회 필요 (bcrypt 비밀번호는 이미 해시)
- `users.password` — bcrypt 해시 유지

### 3.2 암호화 유틸리티 설계

**파일**: `lib/crypto.ts`

```typescript
import crypto from "crypto";

const KEY_HEX = process.env.ENCRYPTION_KEY!;  // 64자 hex = 32bytes
const ALGO = "aes-256-gcm";

export function encrypt(plaintext: string): string {
  if (!plaintext) return "";
  const key = Buffer.from(KEY_HEX, "hex");
  const iv  = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // 저장 형식: iv(24hex) + tag(32hex) + ciphertext(hex)
  return iv.toString("hex") + tag.toString("hex") + enc.toString("hex");
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext || ciphertext.length < 56) return ciphertext;
  const key = Buffer.from(KEY_HEX, "hex");
  const iv  = Buffer.from(ciphertext.slice(0, 24), "hex");
  const tag = Buffer.from(ciphertext.slice(24, 56), "hex");
  const enc = Buffer.from(ciphertext.slice(56), "hex");
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(enc).toString("utf8") + decipher.final("utf8");
}

// 검색용 결정론적 해시 (이름 검색 인덱스)
export function hashForSearch(value: string): string {
  return crypto.createHmac("sha256", KEY_HEX).update(value).digest("hex");
}
```

### 3.3 DB 스키마 변경 (v2)

```sql
-- offerings 테이블 변경
ALTER TABLE offerings
  ADD COLUMN IF NOT EXISTS member_name_enc  TEXT,        -- AES-256-GCM 암호문
  ADD COLUMN IF NOT EXISTS member_name_hash VARCHAR(64); -- HMAC-SHA256 검색 인덱스

CREATE INDEX IF NOT EXISTS idx_offerings_member_hash ON offerings(member_name_hash);

-- members 테이블 변경
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS name_enc  TEXT,
  ADD COLUMN IF NOT EXISTS name_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_members_name_hash ON members(name_hash);

-- feedback 테이블 변경
ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS submitter_enc TEXT;
```

### 3.4 마이그레이션 전략

**단계 1 (현재)**: 기존 `member_name` 컬럼 유지 + 새 컬럼 추가  
**단계 2**: 기존 데이터 일괄 암호화 (`scripts/encrypt-pii.ts`)  
**단계 3**: 코드에서 `member_name` 대신 `member_name_enc`/`member_name_hash` 사용  
**단계 4**: 기존 `member_name` 컬럼 DROP (데이터 검증 후)

### 3.5 환경변수 추가

```bash
# .env.production / Vercel 환경변수
ENCRYPTION_KEY="<64자 hex — openssl rand -hex 32 로 생성>"
```

### 3.6 API 레벨 적용 예시

```typescript
// app/api/offerings/route.ts (수정 후)
import { encrypt, decrypt, hashForSearch } from "@/lib/crypto";

// POST — 저장 시 암호화
const encName  = encrypt(member_name);
const hashName = hashForSearch(member_name);
await sql`
  INSERT INTO offerings (..., member_name_enc, member_name_hash)
  VALUES (..., ${encName}, ${hashName})
`;

// GET — 조회 시 복호화
rows.map(r => ({ ...r, member_name: decrypt(r.member_name_enc as string) }))
```

---

## 4. 보안 헤더 설정 (v2 적용 완료)

**파일**: `next.config.mjs`

| 헤더 | 값 | 대응 취약점 |
|------|-----|-----------|
| `Content-Security-Policy` | default-src 'self'; frame-ancestors 'none' | H-02 HIGH: XSS 방어 |
| `X-Frame-Options` | DENY | H-03 MEDIUM: 클릭재킹 |
| `X-Content-Type-Options` | nosniff | H-04 LOW: MIME 스니핑 |
| `Referrer-Policy` | strict-origin-when-cross-origin | H-05 LOW: 정보 노출 |
| `Permissions-Policy` | camera=(), microphone=(), geolocation=() | H-06 LOW: 기능 제어 |

---

## 5. 접근 제어 설계

### 5.1 역할 모델
| 역할 | 접근 가능 페이지 | 비고 |
|------|--------------|------|
| `admin` | 전체 | 현재 관리자 1명 |
| (미인증) | `/login` 만 | Middleware 강제 리다이렉트 |

### 5.2 Middleware 보호 경로
```
/dashboard, /offerings, /expenses, /weekly-report,
/account-book, /income, /expense-view, /account-mgmt, /admin
```

### 5.3 API 인증
모든 API Route (`/api/*`) → `getServerSession(authOptions)` 검사 → 401 반환

---

## 6. 시스템 흐름도

### 6.1 헌금 입력 흐름 (암호화 적용 후)
```
사용자 입력 (이름 평문)
    ↓
[Client] → POST /api/offerings
    ↓
[Server] encrypt(member_name) → member_name_enc
         hashForSearch(member_name) → member_name_hash
    ↓
[NeonDB] INSERT (암호문 저장)
    ↓
[Server] decrypt(member_name_enc) → 복원
    ↓
[Client] 화면 표시 (평문)
```

---

## 7. 향후 로드맵

| 우선순위 | 기능 | 비고 |
|---------|------|------|
| HIGH | PII 암호화 구현 (lib/crypto.ts + 마이그레이션) | ENCRYPTION_KEY Vercel 등록 후 |
| HIGH | 보안 헤더 배포 반영 | 완료 (next.config.mjs) |
| MEDIUM | Excel 업로드 PII 처리 (업로드 시 암호화) | |
| MEDIUM | 감사 로그 (누가 언제 헌금대장 조회) | |
| LOW | 교인 등록 UI (/members 페이지) | |
| LOW | 통장거래 연동 (CSV 업로드) | |
| LOW | 연간 보고서 자동 생성 (PDF) | |

---

## 8. SecuScanner 취약점 진단 결과 (2026-05-30)

| ID | 등급 | 제목 | 상태 |
|----|------|------|------|
| H-02 | HIGH | CSP 헤더 누락 | ✅ **v2에서 조치 완료** |
| H-03 | MEDIUM | X-Frame-Options 부재 | ✅ **v2에서 조치 완료** |
| H-04 | LOW | X-Content-Type-Options 부재 | ✅ **v2에서 조치 완료** |
| H-05 | LOW | Referrer-Policy 부재 | ✅ **v2에서 조치 완료** |
| H-06 | LOW | Permissions-Policy 부재 | ✅ **v2에서 조치 완료** |
| T-03 | INFO | 인증서 만료 57일 (2026-07-27) | ⚠️ Vercel 자동 갱신 확인 필요 |
| T-INFO | INFO | TLSv1.3 사용 중 | ✅ 양호 |
| PII-01 | HIGH | DB 개인정보 평문 저장 | 🔧 **v2 설계 완료, 구현 예정** |

**스캔 후 등급 목표**: D → B (보안 헤더 조치 후 재스캔 시)
