-- Enable RLS for all core tables
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;

-- Policies for 'chats'
CREATE POLICY "chats_select_own" ON chats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "chats_insert_own" ON chats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chats_update_own" ON chats FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chats_delete_own" ON chats FOR DELETE USING (auth.uid() = user_id);

-- Policies for 'folders'
CREATE POLICY "folders_select_own" ON folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "folders_insert_own" ON folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "folders_update_own" ON folders FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "folders_delete_own" ON folders FOR DELETE USING (auth.uid() = user_id);

-- Policies for 'prompts'
CREATE POLICY "prompts_select_own" ON prompts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "prompts_insert_own" ON prompts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "prompts_update_own" ON prompts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "prompts_delete_own" ON prompts FOR DELETE USING (auth.uid() = user_id);

-- Policies for 'images'
CREATE POLICY "images_select_own" ON images FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "images_insert_own" ON images FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "images_update_own" ON images FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "images_delete_own" ON images FOR DELETE USING (auth.uid() = user_id);

-- Policies for 'lists'
CREATE POLICY "lists_select_own" ON lists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "lists_insert_own" ON lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lists_update_own" ON lists FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lists_delete_own" ON lists FOR DELETE USING (auth.uid() = user_id);

-- Policies for 'list_items'
-- The user_id is inherited via the parent list
CREATE POLICY "list_items_select_own" ON list_items FOR SELECT USING (EXISTS (SELECT 1 FROM lists WHERE lists.id = list_items.list_id AND lists.user_id = auth.uid()));
CREATE POLICY "list_items_insert_own" ON list_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM lists WHERE lists.id = list_items.list_id AND lists.user_id = auth.uid()));
CREATE POLICY "list_items_update_own" ON list_items FOR UPDATE USING (EXISTS (SELECT 1 FROM lists WHERE lists.id = list_items.list_id AND lists.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM lists WHERE lists.id = list_items.list_id AND lists.user_id = auth.uid()));
CREATE POLICY "list_items_delete_own" ON list_items FOR DELETE USING (EXISTS (SELECT 1 FROM lists WHERE lists.id = list_items.list_id AND lists.user_id = auth.uid()));
