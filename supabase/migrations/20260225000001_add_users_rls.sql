-- Enable RLS for the users table (profiles)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Polices for 'users'
CREATE POLICY "users_select_own" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_delete_own" ON users FOR DELETE USING (auth.uid() = id);

-- We assume insert is handled via auth trigger, but just in case:
-- CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (auth.uid() = id);
-- CREATE POLICY "users_delete_own" ON users FOR DELETE USING (auth.uid() = id);
