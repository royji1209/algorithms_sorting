-- =============================================================================
-- 여백의 우체통 (Margin Mailbox) - Supabase PostgreSQL Schema & Strict RLS
-- Phase 1: DB 스키마 및 보안/프라이버시 정책
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 0. 관리자 이메일 이중 검증 헬퍼 함수 (JWT Email 기반)
-- 클라이언트 UI 및 Next.js 미들웨어와 더불어 DB RLS 레벨에서도 관리자 권한을 검증합니다.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_whitelist (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_whitelist ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin_email()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_whitelist
    WHERE LOWER(email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
  );
$$;

-- 관리자 목록은 본인 이메일 여부만 확인 가능
CREATE POLICY "admin_whitelist_select_self"
  ON public.admin_whitelist
  FOR SELECT
  USING (LOWER(email) = LOWER(COALESCE(auth.jwt() ->> 'email', '')));

-- -----------------------------------------------------------------------------
-- 1. profiles (사용자 프로필 - 익명성 보장: 실명 대신 필명 pen_name 만 노출)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pen_name TEXT NOT NULL CHECK (char_length(pen_name) BETWEEN 1 AND 30),
  bio TEXT DEFAULT '',
  is_expert BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 프로필 조회: 익명 필명(pen_name) 조회 허용 (이메일/실명 컬럼을 아예 두지 않아 개인정보 원천 보호)
CREATE POLICY "profiles_select_public_pen_name"
  ON public.profiles
  FOR SELECT
  USING (true);

-- 프로필 생성 및 수정: 오직 본인(auth.uid())만 가능
CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- 2. emotion_logs (감정 체크인 기록 - 지극히 민감한 개인 감정 원문)
-- RLS: 오직 작성자 본인(auth.uid() = user_id)만 SELECT/INSERT/UPDATE/DELETE 가능
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.emotion_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL CHECK (char_length(raw_text) BETWEEN 1 AND 1000),
  emotion_tags TEXT[] NOT NULL DEFAULT '{}',
  valence TEXT NOT NULL DEFAULT 'neutral' CHECK (valence IN ('positive', 'neutral', 'negative')),
  intensity SMALLINT NOT NULL DEFAULT 3 CHECK (intensity BETWEEN 1 AND 5),
  ai_empathy_message TEXT NOT NULL,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_emotion_logs_user_date ON public.emotion_logs (user_id, checkin_date DESC);

ALTER TABLE public.emotion_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "emotion_logs_select_own_only"
  ON public.emotion_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "emotion_logs_insert_own_only"
  ON public.emotion_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "emotion_logs_update_own_only"
  ON public.emotion_logs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "emotion_logs_delete_own_only"
  ON public.emotion_logs
  FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 3. posts (시·일상 기록 및 수요일 문학 전문가 추천 시)
-- 비경쟁 원칙: 좋아요(likes), 조회수(views), 별점(rating) 컬럼을 일절 두지 않음
-- RLS: is_public = false 인 비공개 글은 오직 작성자 본인(auth.uid() = author_id)만 조회 가능
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_pen_name TEXT NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  category TEXT NOT NULL DEFAULT 'poem' CHECK (category IN ('poem', 'diary', 'expert_pick')),
  emotion_tags TEXT[] NOT NULL DEFAULT '{}',
  mood_valence TEXT NOT NULL DEFAULT 'warm' CHECK (mood_valence IN ('bright', 'warm', 'calm', 'melancholy', 'deep_gloomy')),
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  is_expert_curated BOOLEAN NOT NULL DEFAULT FALSE,
  expert_commentary TEXT,
  original_poet TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_public_created ON public.posts (is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_created ON public.posts (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_expert_curated ON public.posts (is_expert_curated, is_public);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- 조회 정책: 공개(is_public = true) 글이거나 작성자 본인(auth.uid() = author_id)인 경우에만 허용
CREATE POLICY "posts_select_public_or_own"
  ON public.posts
  FOR SELECT
  USING (
    is_public = TRUE
    OR auth.uid() = author_id
  );

-- 작성 정책: 본인 명의 글만 작성 가능하며, 전문가 추천 시(is_expert_curated = true 또는 expert_pick)는 관리자 이메일만 허용
CREATE POLICY "posts_insert_own_and_admin_guard"
  ON public.posts
  FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND (
      (is_expert_curated = FALSE AND category <> 'expert_pick')
      OR public.is_admin_email()
    )
  );

-- 수정 정책: 작성자 본인 또는(전문가 추천 시의 경우) 관리자 이메일만 허용
CREATE POLICY "posts_update_own_or_admin"
  ON public.posts
  FOR UPDATE
  USING (
    auth.uid() = author_id
    OR (is_expert_curated = TRUE AND public.is_admin_email())
  )
  WITH CHECK (
    auth.uid() = author_id
    OR (is_expert_curated = TRUE AND public.is_admin_email())
  );

-- 삭제 정책: 작성자 본인 또는 관리자 이메일만 허용
CREATE POLICY "posts_delete_own_or_admin"
  ON public.posts
  FOR DELETE
  USING (
    auth.uid() = author_id
    OR (is_expert_curated = TRUE AND public.is_admin_email())
  );

-- -----------------------------------------------------------------------------
-- 4. letter_deliveries (요일별 시 편지 배달 내역 & 하루 1~2통 캐싱)
-- RLS: 수신자 본인(auth.uid() = recipient_id)만 조회 및 생성/읽음 처리 가능
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.letter_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  emotion_log_id UUID REFERENCES public.emotion_logs(id) ON DELETE SET NULL,
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  theme_code TEXT NOT NULL CHECK (
    theme_code IN (
      'mon_similar',
      'tue_random',
      'wed_expert',
      'thu_amateur',
      'fri_sun_weekly_comfort'
    )
  ),
  curation_note TEXT NOT NULL DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (recipient_id, delivery_date, post_id)
);

CREATE INDEX IF NOT EXISTS idx_letter_deliveries_recipient_date
  ON public.letter_deliveries (recipient_id, delivery_date DESC);

ALTER TABLE public.letter_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "letter_deliveries_select_recipient_only"
  ON public.letter_deliveries
  FOR SELECT
  USING (auth.uid() = recipient_id);

CREATE POLICY "letter_deliveries_insert_recipient_only"
  ON public.letter_deliveries
  FOR INSERT
  WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "letter_deliveries_update_recipient_only"
  ON public.letter_deliveries
  FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- prd_tech_nfr.md의 daily_deliveries 명칭 호환용 뷰(View)
CREATE OR REPLACE VIEW public.daily_deliveries
WITH (security_invoker = true) AS
SELECT * FROM public.letter_deliveries;

-- -----------------------------------------------------------------------------
-- 5. comments (비경쟁 구절 감상 댓글)
-- 좋아요/별점 없이 시의 특정 구절(quoted_line)과 따뜻한 감상(content)만 기록
-- RLS: 공개된 시에 대해서만 조회/작성 가능하며, 비공개 글에는 접근 불가
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_pen_name TEXT NOT NULL,
  quoted_line TEXT DEFAULT '' CHECK (char_length(quoted_line) <= 300),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post_created ON public.comments (post_id, created_at ASC);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 조회 정책: 해당 게시글이 공개(is_public = true)이거나 게시글 작성자 본인인 경우에만 댓글 조회 가능
CREATE POLICY "comments_select_visible_post"
  ON public.comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = comments.post_id
        AND (p.is_public = TRUE OR p.author_id = auth.uid())
    )
  );

-- 작성 정책: 로그인한 본인 명의이며 대상 게시글이 공개(is_public = true)인 경우에만 감상 댓글 작성 가능
CREATE POLICY "comments_insert_on_public_post"
  ON public.comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = comments.post_id
        AND p.is_public = TRUE
    )
  );

-- 삭제 정책: 댓글 작성자 본인 또는 원글 작성자만 삭제 가능
CREATE POLICY "comments_delete_own_or_post_owner"
  ON public.comments
  FOR DELETE
  USING (
    auth.uid() = author_id
    OR EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = comments.post_id
        AND p.author_id = auth.uid()
    )
  );
