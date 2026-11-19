-- =============================================================================
-- 여백의 우체통 (Margin Mailbox) - Supabase PostgreSQL Schema & Strict RLS
-- Phase 1: DB 스키마 및 보안/프라이버시 정책
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

CREATE POLICY "admin_whitelist_select_self"
  ON public.admin_whitelist
  FOR SELECT
  USING (LOWER(email) = LOWER(COALESCE(auth.jwt() ->> 'email', '')));

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pen_name TEXT NOT NULL CHECK (char_length(pen_name) BETWEEN 1 AND 30),
  bio TEXT DEFAULT '',
  is_expert BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_public_pen_name"
  ON public.profiles
  FOR SELECT
  USING (true);

CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

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

ALTER TABLE public.emotion_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "emotion_logs_select_own_only"
  ON public.emotion_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "emotion_logs_insert_own_only"
  ON public.emotion_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

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

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_select_public_or_own"
  ON public.posts
  FOR SELECT
  USING (is_public = TRUE OR auth.uid() = author_id);

CREATE POLICY "posts_insert_own_and_admin_guard"
  ON public.posts
  FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND ((is_expert_curated = FALSE AND category <> 'expert_pick') OR public.is_admin_email())
  );

CREATE TABLE IF NOT EXISTS public.letter_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  emotion_log_id UUID REFERENCES public.emotion_logs(id) ON DELETE SET NULL,
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  theme_code TEXT NOT NULL,
  curation_note TEXT NOT NULL DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (recipient_id, delivery_date, post_id)
);

ALTER TABLE public.letter_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "letter_deliveries_select_recipient_only"
  ON public.letter_deliveries
  FOR SELECT
  USING (auth.uid() = recipient_id);

CREATE OR REPLACE VIEW public.daily_deliveries
WITH (security_invoker = true) AS
SELECT * FROM public.letter_deliveries;

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_pen_name TEXT NOT NULL,
  quoted_line TEXT DEFAULT '' CHECK (char_length(quoted_line) <= 300),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

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
