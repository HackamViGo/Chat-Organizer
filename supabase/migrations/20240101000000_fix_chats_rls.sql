-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  platform TEXT NOT NULL,
  url TEXT,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists TO AVOID ERRORS
DROP POLICY IF EXISTS "Users can insert their own chats" ON chats;
DROP POLICY IF EXISTS "Users can view their own chats" ON chats;
DROP POLICY IF EXISTS "Users can update their own chats" ON chats;
DROP POLICY IF EXISTS "Users can delete their own chats" ON chats;


-- Create policies
CREATE POLICY "Users can insert their own chats" 
ON chats FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own chats" 
ON chats FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats" 
ON chats FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats" 
ON chats FOR DELETE 
USING (auth.uid() = user_id);
