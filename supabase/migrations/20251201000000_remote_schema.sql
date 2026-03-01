-- ============================================================
-- Remote Schema Snapshot (generated from database.types.ts)
-- Used to seed the local development database
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA extensions;

-- Enums
CREATE TYPE public.folder_type_enum AS ENUM ('chat', 'list', 'image', 'prompt');

-- ============================================================
-- Tables
-- ============================================================

-- users (synced with auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  full_name     text,
  avatar_url    text,
  settings      jsonb,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- folders
CREATE TABLE IF NOT EXISTS public.folders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  type          public.folder_type_enum,
  color         text,
  icon          text,
  parent_id     uuid REFERENCES public.folders(id) ON DELETE SET NULL,
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- chats
CREATE TABLE IF NOT EXISTS public.chats (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text NOT NULL,
  content          text,
  summary          text,
  detailed_summary text,
  messages         jsonb,
  tags             jsonb,
  tasks            jsonb,
  platform         text,
  url              text,
  source_id        text,
  embedding        extensions.vector(1536),
  is_archived      boolean DEFAULT false,
  folder_id        uuid REFERENCES public.folders(id) ON DELETE SET NULL,
  user_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- prompts
CREATE TABLE IF NOT EXISTS public.prompts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title               text NOT NULL,
  content             text NOT NULL,
  color               text,
  use_in_context_menu boolean DEFAULT false,
  folder_id           uuid REFERENCES public.folders(id) ON DELETE SET NULL,
  user_id             uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- images
CREATE TABLE IF NOT EXISTS public.images (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url         text NOT NULL,
  name        text,
  path        text,
  mime_type   text,
  size        bigint,
  source_url  text,
  folder_id   uuid REFERENCES public.folders(id) ON DELETE SET NULL,
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now()
);

-- lists
CREATE TABLE IF NOT EXISTS public.lists (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  color       text,
  folder_id   uuid REFERENCES public.folders(id) ON DELETE SET NULL,
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- list_items
CREATE TABLE IF NOT EXISTS public.list_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text        text NOT NULL,
  completed   boolean DEFAULT false,
  position    integer DEFAULT 0,
  list_id     uuid NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS chats_user_id_idx ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS chats_folder_id_idx ON public.chats(folder_id);
CREATE INDEX IF NOT EXISTS folders_user_id_idx ON public.folders(user_id);
CREATE INDEX IF NOT EXISTS prompts_user_id_idx ON public.prompts(user_id);
CREATE INDEX IF NOT EXISTS images_user_id_idx ON public.images(user_id);
CREATE INDEX IF NOT EXISTS lists_user_id_idx ON public.lists(user_id);
CREATE INDEX IF NOT EXISTS list_items_list_id_idx ON public.list_items(list_id);

-- ============================================================
-- Auth trigger: create user record on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- match_chats function (vector similarity search)
-- ============================================================
CREATE OR REPLACE FUNCTION public.match_chats(
  query_embedding extensions.vector(1536),
  match_threshold float,
  match_count integer,
  p_user_id uuid
)
RETURNS TABLE (
  id               uuid,
  title            text,
  url              text,
  summary          text,
  detailed_summary text,
  tags             jsonb,
  tasks            jsonb,
  updated_at       timestamptz,
  similarity       float
)
LANGUAGE sql STABLE
SET search_path TO public, extensions
AS $$
  SELECT
    c.id,
    c.title,
    c.url,
    c.summary,
    c.detailed_summary,
    c.tags,
    c.tasks,
    c.updated_at,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.chats c
  WHERE
    c.user_id = p_user_id
    AND c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;
