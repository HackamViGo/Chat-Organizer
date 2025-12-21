-- ============================================
-- IMAGES FEATURE COMPLETE SETUP
-- Execute this in Supabase Dashboard → SQL Editor
-- ============================================

-- STEP 1: Add columns to tables
ALTER TABLE folders 
ADD COLUMN IF NOT EXISTS type TEXT,
ADD COLUMN IF NOT EXISTS icon TEXT;

ALTER TABLE images 
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS mime_type TEXT,
ADD COLUMN IF NOT EXISTS size BIGINT;

-- STEP 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_images_folder_id ON images(folder_id);
CREATE INDEX IF NOT EXISTS idx_images_user_id ON images(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_type ON folders(type);

-- STEP 3: Add helpful comments
COMMENT ON COLUMN folders.type IS 'Type of folder: chat, prompt, or image';
COMMENT ON COLUMN folders.icon IS 'Icon identifier from FOLDER_ICONS';
COMMENT ON COLUMN images.folder_id IS 'Optional folder for organizing images';
COMMENT ON COLUMN images.name IS 'Original filename';
COMMENT ON COLUMN images.mime_type IS 'MIME type of the image';
COMMENT ON COLUMN images.size IS 'File size in bytes';

-- STEP 4: Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- STEP 5: Add RLS policies for storage security
CREATE POLICY "Users can upload own images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'images');

-- ============================================
-- ✅ SETUP COMPLETE!
-- ============================================
-- Next steps:
-- 1. Restart dev server: npm run dev
-- 2. Go to: http://localhost:3000/images
-- 3. Test: Upload → Create Folder → Move → Delete
-- ============================================
