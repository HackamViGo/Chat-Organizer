<!-- doc: FEATURE_DATA_FLOW.md | version: 1.0 | last-updated: 2026-03-03 | author: DOCS_LIBRARIAN -->

# 📄 FEATURE_DATA_FLOW.md

## Feature Data Flows

### Save Chat (Extension → Dashboard)
1. Extension (Content Script): Extracts raw chat data from AI platform (e.g., on button click or new message).
2. Extension (Content Script): Sends `saveToDashboard` message to Service Worker via `chrome.runtime.sendMessage`.
3. Extension (Service Worker/MessageRouter): Receives message, delegates to platform-specific adapter.
4. Extension (Platform Adapter): Normalizes raw chat data into universal `Conversation` schema (e.g., `normalizeChatGPT`).
5. Extension (SyncManager): Adds normalized `Chat` object to persistent queue (`chrome.storage.local`).
6. Extension (SyncManager): Fetches `Bearer JWT` from `chrome.storage.local`.
7. Extension (SyncManager): Makes `POST` request to Dashboard API `/api/chats` with JWT and `X-Extension-Key`.
8. Dashboard (API Route `/api/chats`): Receives request, performs Zod validation, checks for duplicates, and inserts/updates chat in Supabase.
9. Supabase Realtime: Broadcasts `UPDATE` event to subscribed Dashboard clients.
10. Dashboard (useChatStore): Receives `UPDATE` event, updates local store (`addChat` / `updateChat`), and triggers UI re-render.
11. Extension (SyncManager): If API call fails, retries up to 5 times, then drops from queue and logs error.

### Delete Chat (UI → Supabase)
1. Dashboard (UI: ChatCard/ChatActionMenu): User clicks 'Delete' and confirms in modal.
2. Dashboard (useChatStore): Calls `deleteChat(id)` or `deleteChats(ids)`.
3. Dashboard (useChatStore - Optimistic Update): Chat(s) are immediately removed from local store, UI updates.
4. Dashboard (SyncBatchService): Enqueues `DELETE` request to `/api/chats?ids={id}` (or `?ids={id1},{id2}`).

### Create Folder
1. Dashboard (UI: HybridSidebar/FolderTree or PromptsPage): User initiates folder creation (e.g., clicks 'New Folder' button).
2. Dashboard (useFolderStore): Calls `addFolder(newFolder)` (optimistic update).
3. Dashboard (Create Folder Modal/Form): User inputs folder name, type, icon, color.
4. Dashboard (API Route `/api/folders` `POST`): Receives folder data, performs Zod validation (`createFolderSchema`).
5. Supabase: Inserts new folder into `folders` table.
6. Supabase Realtime: Broadcasts `INSERT` event to subscribed Dashboard clients.
7. Dashboard (useFolderStore): Updates local state, triggers UI re-render.
8. Dashboard (UI): Displays toast notification for success/failure.

### Move Chat to Folder
1. Dashboard (UI: ChatCard/FolderTree): User drags a chat onto a folder.
2. Dashboard (ChatCard): Calls `updateChat(chatId, { folder_id: targetFolderId })`.
3. Dashboard (useChatStore - Optimistic Update): Chat's folder_id is immediately updated in local store, UI re-renders (chat moves).
4. Dashboard (SyncBatchService): Enqueues `PUT` request to `/api/chats` with `chatId` and `folder_id` update.
5. Dashboard (API Route `/api/chats` `PUT`): Authenticates user, updates `folder_id` in Supabase for the specified chat.
6. Supabase Realtime: Broadcasts `UPDATE` event for the moved chat.
7. Dashboard (useChatStore - Rollback): If API request fails, local store is rolled back (chat returns to original folder).
8. Dashboard (UI): Displays toast notification for success/failure.

### Create/Edit Prompt
1. Dashboard (UI: PromptsPage/CreatePromptModal): User initiates prompt creation or editing.
2. Dashboard (usePromptStore): Calls `addPrompt(newPrompt)` or `updatePrompt(promptId, updates)` (optimistic update).
3. Dashboard (CreatePromptModal/Form): User inputs prompt title, content, color, context menu setting.
4. Dashboard (API Route `/api/prompts` `POST`/`PUT`): Receives prompt data, performs Zod validation (`createPromptSchema`/`updatePromptSchema`).
5. Supabase: Inserts new prompt or updates existing prompt in `prompts` table.
6. Supabase Realtime: Broadcasts `INSERT`/`UPDATE` event to subscribed Dashboard clients.
7. Dashboard (usePromptStore): Updates local state, triggers UI re-render.
8. Dashboard (UI): Displays toast notification for success/failure.

### AI Enrichment (генериране на summary/tags)
1. Dashboard (UI: ChatCard/AIAnalysisModal): User clicks 'AI Analyze' button.
2. Dashboard (ChatCard): Sets `isAnalyzing` state to true, initiates API call to `/api/ai/generate`.
3. Dashboard (API Route `/api/ai/generate` `POST`): Receives chat content, performs validation (`aiGenerateRequestSchema`).
4. Dashboard (API Route - Rate Limiting): Checks `aiRateLimit` for user, returns 429 if exceeded.
5. Dashboard (API Route): Retrieves Gemini API key (from request or env).
6. Shared (AI Service `analyzeChatContent`): Calls Google Generative AI SDK with content and API key, using `gemini-3-flash` model for analysis.
7. Shared (AI Service): Parses AI response (JSON) to extract `title`, `summary`, `tags`, `tasks`, and `embedding`.
8. Dashboard (API Route): Returns AI analysis results.
9. Dashboard (ChatCard): Receives analysis results, calls `updateChat(chatId, { ...results })`.
10. Dashboard (useChatStore - Optimistic Update): Chat is updated in local store with new AI-generated data, UI re-renders.
11. Dashboard (UI): Displays toast notification for success/failure, `isAnalyzing` set to false.

### Folder Tree navigation (само UI state, без API)
1. Dashboard (UI: HybridSidebar/FolderTree): User expands/collapses folders, or clicks on a folder/chat/prompt/image/list item.
2. Dashboard (useUIStore / useFolderStore): Updates local UI state (e.g., `isMobileSidebarOpen`, `expandedFolders`, `selectedFolderId`).
3. Dashboard (Next.js useRouter/useSearchParams): Updates URL search parameters (e.g., `?folder=id`, `?id=chatId`) to reflect navigation.
4. Dashboard (UI): Components re-render based on updated UI state and URL parameters, displaying content of the selected folder or item.

### Multi-select & Bulk Delete
1. Dashboard (UI: ChatsPage/ChatCard): User initiates multi-select mode (e.g., long-press on a chat card, or clicks a 'Select All' button).
2. Dashboard (useChatStore): Calls `toggleChatSelection(id)`, `selectAllChats()`, or `deselectAllChats()` to update `selectedChatIds` set.
3. Dashboard (UI: MasterToolbar): Displays bulk action options (e.g., 'Delete') when `selectedChatIds` is not empty.
4. Dashboard (UI: MasterToolbar): User clicks 'Delete' button for selected chats.
5. Dashboard (useChatStore): Calls `deleteChats(selectedChatIds.values())`.
6. Dashboard (useChatStore - Optimistic Update): Selected chats are immediately removed from local store, UI updates.
7. Dashboard (SyncBatchService): Enqueues `DELETE` request to `/api/chats?ids={id1},{id2},...` with all selected chat IDs.
8. Dashboard (API Route `/api/chats` `DELETE`): Authenticates user, deletes multiple chats from Supabase.
9. Supabase Realtime: Broadcasts `DELETE` events for removed chats.
10. Dashboard (useChatStore - Rollback): If API request fails, local store is rolled back.
11. Dashboard (UI): Displays toast notification for success/failure.
