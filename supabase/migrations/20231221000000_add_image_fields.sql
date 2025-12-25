-- Add missing columns to folders table
ALTER TABLE folders 
ADD COLUMN IF NOT EXISTS type TEXT,
ADD COLUMN IF NOT EXISTS icon TEXT;

-- Add missing columns to images table
ALTER TABLE images 
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS mime_type TEXT,
ADD COLUMN IF NOT EXISTS size BIGINT;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_images_folder_id ON images(folder_id);
CREATE INDEX IF NOT EXISTS idx_images_user_id ON images(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_type ON folders(type);

-- Add comment
COMMENT ON COLUMN folders.type IS 'Type of folder: chat, prompt, or image';
COMMENT ON COLUMN folders.icon IS 'Icon identifier from FOLDER_ICONS';
COMMENT ON COLUMN images.folder_id IS 'Optional folder for organizing images';
COMMENT ON COLUMN images.name IS 'Original filename';
COMMENT ON COLUMN images.mime_type IS 'MIME type of the image';
COMMENT ON COLUMN images.size IS 'File size in bytes';
