-- 교회 재정관리 포털 DB 스키마
-- NeonDB (PostgreSQL) 기준

-- 확장
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 사용자 (관리자 1명)
CREATE TABLE IF NOT EXISTS users (
  id        SERIAL PRIMARY KEY,
  email     VARCHAR(255) UNIQUE NOT NULL,
  password  VARCHAR(255) NOT NULL,  -- bcrypt hash
  name      VARCHAR(100) NOT NULL DEFAULT '관리자',
  role      VARCHAR(50)  NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 헌금 내역
CREATE TABLE IF NOT EXISTS offerings (
  id                SERIAL PRIMARY KEY,
  week_id           VARCHAR(10),           -- '5-3' 형식 (5월 3주차)
  entry_date        DATE NOT NULL,
  seq_no            INTEGER,               -- 연번 (자동 생성)
  kind              VARCHAR(100) NOT NULL, -- 십일조헌금, 감사헌금, ...
  member_name       VARCHAR(100),          -- 교인 이름 (평문, 마이그레이션 후 DROP 예정)
  member_name_enc   TEXT,                  -- AES-256-GCM 암호화 이름
  member_name_hash  VARCHAR(64),           -- HMAC-SHA256 검색 해시
  amount            INTEGER NOT NULL DEFAULT 0,
  note              VARCHAR(500),
  created_by        INTEGER REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offerings_week    ON offerings(week_id);
CREATE INDEX IF NOT EXISTS idx_offerings_date    ON offerings(entry_date);
CREATE INDEX IF NOT EXISTS idx_offerings_kind    ON offerings(kind);

-- 지출 내역
CREATE TABLE IF NOT EXISTS expenses (
  id            SERIAL PRIMARY KEY,
  week_id       VARCHAR(10),
  entry_date    DATE NOT NULL,
  category      VARCHAR(100) NOT NULL, -- 사례비, 교회관리비, ...
  detail        VARCHAR(500) NOT NULL,
  amount        INTEGER NOT NULL DEFAULT 0,
  note          VARCHAR(500),
  auto_detected BOOLEAN DEFAULT FALSE,
  created_by    INTEGER REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_week     ON expenses(week_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date     ON expenses(entry_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- 교인 목록 (이름 자동완성용)
CREATE TABLE IF NOT EXISTS members (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100),             -- 평문 이름 (enc-only 인서트 지원, nullable)
  name_enc   TEXT,                     -- AES-256-GCM 암호화 이름
  name_hash  VARCHAR(64),              -- HMAC-SHA256 검색 해시
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_members_name           ON members(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_name_hash ON members(name_hash);

-- 피드백
CREATE TABLE IF NOT EXISTS feedback (
  id            SERIAL PRIMARY KEY,
  page          VARCHAR(100) NOT NULL,  -- 'offerings', 'expenses', 'dashboard', ...
  content       TEXT NOT NULL,
  submitter     VARCHAR(100),           -- 평문 (마이그레이션 후 DROP 예정)
  submitter_enc TEXT,                   -- AES-256-GCM 암호화 제출자명
  status        VARCHAR(50) DEFAULT 'pending',  -- pending, reviewed, done
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_page   ON feedback(page);

-- 주간결산 스냅샷 (출력용 캐시)
CREATE TABLE IF NOT EXISTS weekly_reports (
  id              SERIAL PRIMARY KEY,
  week_id         VARCHAR(10) NOT NULL UNIQUE,
  prev_balance    INTEGER DEFAULT 0,   -- 전주이월금
  total_income    INTEGER DEFAULT 0,   -- 금주수입계
  total_expense   INTEGER DEFAULT 0,   -- 금주지출
  closing_balance INTEGER DEFAULT 0,   -- 금주마감잔액
  bank_balance    INTEGER DEFAULT 0,   -- 통장잔액
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
