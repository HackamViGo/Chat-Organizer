# Dashboard Audit — apps/dashboard

## §0 File System Scan
```text
apps/dashboard/src/app/api/account/delete/route.ts
apps/dashboard/src/app/api/ai/enhance-prompt/route.ts
apps/dashboard/src/app/api/ai/generate/route.ts
apps/dashboard/src/app/api/ai/search/route.ts
apps/dashboard/src/app/api/auth/callback/route.ts
apps/dashboard/src/app/api/auth/refresh/route.ts
apps/dashboard/src/app/api/avatar/upload/route.ts
apps/dashboard/src/app/api/chats/extension/route.ts
apps/dashboard/src/app/api/chats/route.ts
apps/dashboard/src/app/api/export/route.ts
apps/dashboard/src/app/api/folders/route.ts
apps/dashboard/src/app/api/images/route.ts
apps/dashboard/src/app/api/import/route.ts
apps/dashboard/src/app/api/prompts/by-category/route.ts
apps/dashboard/src/app/api/prompts/categories/route.ts
apps/dashboard/src/app/api/prompts/proxy-csv/route.ts
apps/dashboard/src/app/api/prompts/route.ts
apps/dashboard/src/app/api/prompts/search/route.ts
apps/dashboard/src/app/api/proxy-image/route.ts
apps/dashboard/src/app/api/stats/route.ts
apps/dashboard/src/app/api/upload/route.ts
apps/dashboard/src/app/api/user/settings/route.ts
apps/dashboard/src/app/archive/page.tsx
apps/dashboard/src/app/auth/callback/route.ts
apps/dashboard/src/app/auth/signin/page.tsx
apps/dashboard/src/app/auth/signup/page.tsx
apps/dashboard/src/app/chats/[id]/page.tsx
apps/dashboard/src/app/chats/page.tsx
apps/dashboard/src/app/download/page.tsx
apps/dashboard/src/app/error.tsx
apps/dashboard/src/app/extension-auth/page.tsx
apps/dashboard/src/app/folder/[id]/page.tsx
apps/dashboard/src/app/global-error.tsx
apps/dashboard/src/app/globals.css
apps/dashboard/src/app/images/page.tsx
apps/dashboard/src/app/layout.tsx
apps/dashboard/src/app/lists/page.tsx
apps/dashboard/src/app/not-found.tsx
apps/dashboard/src/app/page.tsx
apps/dashboard/src/app/profile/page.tsx
apps/dashboard/src/app/prompts/page.tsx
apps/dashboard/src/app/settings/page.tsx
apps/dashboard/src/app/studio/page.tsx
apps/dashboard/src/components/features/brain/GlobalBrain.tsx
apps/dashboard/src/components/features/chats/ChatCard.tsx
apps/dashboard/src/components/features/chats/ChatStudio.tsx
apps/dashboard/src/components/features/chats/CodeBlock.tsx
apps/dashboard/src/components/features/chats/components/AIAnalysisModal.tsx
apps/dashboard/src/components/features/chats/components/ChatActionMenu.tsx
apps/dashboard/src/components/features/chats/components/ChatBadges.tsx
apps/dashboard/src/components/features/chats/MasterToolbar.tsx
apps/dashboard/src/components/features/chats/MessageContent.tsx
apps/dashboard/src/components/features/dashboard/ChatStatisticsCard.tsx
apps/dashboard/src/components/features/dashboard/DailyPromptTipCard.tsx
apps/dashboard/src/components/features/dashboard/DashboardMetrics.tsx
apps/dashboard/src/components/features/dashboard/GPT5AlphaCard.tsx
apps/dashboard/src/components/features/dashboard/NotificationsCard.tsx
apps/dashboard/src/components/features/dashboard/RecentProjects.tsx
apps/dashboard/src/components/features/dashboard/SystemStatusCard.tsx
apps/dashboard/src/components/features/dashboard/UsageChart.tsx
apps/dashboard/src/components/features/dashboard/UserInfoCard.tsx
apps/dashboard/src/components/features/folders/FolderHeader.tsx
apps/dashboard/src/components/features/images/ImagesPage.tsx
apps/dashboard/src/components/features/lists/ListsPage.tsx
apps/dashboard/src/components/features/prompts/CreatePromptModal.tsx
apps/dashboard/src/components/features/prompts/DailyPickCard.tsx
apps/dashboard/src/components/features/prompts/DailyPromptCard.css
apps/dashboard/src/components/features/prompts/DailyPromptCard.tsx
apps/dashboard/src/components/features/prompts/EnhancePromptCard.tsx
apps/dashboard/src/components/features/prompts/PromptCard.tsx
apps/dashboard/src/components/layout/FolderTree.tsx
apps/dashboard/src/components/layout/HybridSidebar.tsx
apps/dashboard/src/components/layout/LayoutWrapper.tsx
apps/dashboard/src/components/providers/DataProvider.tsx
apps/dashboard/src/components/providers/SessionBroadcaster.tsx
apps/dashboard/src/components/providers/ThemeProvider.tsx
apps/dashboard/src/lib/config.ts
apps/dashboard/src/lib/logger.ts
apps/dashboard/src/lib/services/ai.ts
apps/dashboard/src/lib/services/prompt-library-fetcher.ts
apps/dashboard/src/lib/services/smart-prompt-search.ts
apps/dashboard/src/lib/supabase/client.ts
apps/dashboard/src/lib/supabase/server.ts
apps/dashboard/src/middleware.ts
apps/dashboard/src/store/useChatStore.ts
apps/dashboard/src/store/useFolderStore.ts
apps/dashboard/src/store/useImageStore.ts
apps/dashboard/src/store/useListStore.ts
apps/dashboard/src/store/usePromptStore.ts
```

## §1 Route Architecture

### App Route Tree
- `src/app/page.tsx`                 -> PAGE
- `src/app/layout.tsx`               -> LAYOUT
- `src/app/error.tsx`                -> ERROR
- `src/app/global-error.tsx`         -> ERROR
- `src/app/not-found.tsx`            -> NOT-FOUND
- `src/app/archive/page.tsx`         -> PAGE
- `src/app/auth/signin/page.tsx`     -> PAGE
- `src/app/auth/signup/page.tsx`     -> PAGE
- `src/app/chats/page.tsx`           -> PAGE
- `src/app/chats/[id]/page.tsx`      -> PAGE
- `src/app/download/page.tsx`        -> PAGE
- `src/app/extension-auth/page.tsx`  -> PAGE
- `src/app/folder/[id]/page.tsx`     -> PAGE
- `src/app/images/page.tsx`          -> PAGE
- `src/app/lists/page.tsx`           -> PAGE
- `src/app/profile/page.tsx`         -> PAGE
- `src/app/prompts/page.tsx`         -> PAGE
- `src/app/settings/page.tsx`        -> PAGE
- `src/app/studio/page.tsx`          -> PAGE

### Middleware Analysis (`src/middleware.ts`)
- **Matcher**: `/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js|workbox|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)).*)`
- **Branches**:
  - Automatically redirects missing Supabase config to `/auth/signin?config=missing`.
  - Extension and API requests (`OPTIONS`, `/api/`, `/extension-auth`) are allowed with specific CORS headers if Origin belongs to `['chrome-extension://', 'http://localhost', 'http://127.0.0.1']`.
  - Unauthenticated access to non-public routes redirects to `/auth/signin`.
  - Authenticated access to public routes (`/auth/signin`, `/auth/signup`, `/auth/callback`, `/landing`) redirects to `/`.
- **Cookies read/written**: Custom getters/setters override `createServerClient`. Reads `brainbox_remember_me`. If it is `true` and the token is an auth token, it extends session age to 30 days.

### API Routes Analysis

1. **`account/delete/route.ts`**
   - **Methods**: `DELETE`
   - **Auth Check**: Server-side Supabase client (`supabase.auth.getUser()`).
   - **Request Shape**: None.
   - **Response Shape**: `{ success: boolean }` or error.
   - **Zod Schema**: None.
   - **Supabase Table**: Custom deletes from `chats`, `folders`, `prompts`, `images`, and `auth.admin.deleteUser`.

2. **`ai/enhance-prompt/route.ts`**
   - **Methods**: `POST`
   - **Auth Check**: None (Relies on optional `apiKey` in request).
   - **Request Shape**: `{ prompt: string, apiKey: string? }`
   - **Response Shape**: `{ enhancedPrompt: string }`
   - **Zod Schema**: Inline `requestSchema`. No shared schema usage.
   - **Supabase Table**: None.

3. **`ai/generate/route.ts`**
   - **Methods**: `POST`
   - **Auth Check**: None (Relies on `apiKey`).
   - **Request Shape**: `{ content: string, apiKey?: string, history?: array, systemInstruction?: string }`
   - **Response Shape**: Content generation result (tags, title, category etc).
   - **Zod Schema**: Inline `requestSchema`. No shared schema.
   - **Supabase Table**: None.

4. **`ai/search/route.ts`**
   - **Methods**: `POST`
   - **Auth Check**: User session (`createServerSupabaseClient`).
   - **Request Shape**: `{ query: string, limit?: number, threshold?: number }`
   - **Response Shape**: Matched `chats` array.
   - **Zod Schema**: Inline `searchSchema`.
   - **Supabase Table**: Executes RPC `match_chats`.

5. **`auth/callback/route.ts`**
   - **Methods**: `GET`
   - **Auth Check**: None (This performs the code exchange).
   - **Request Shape**: Search param `code`.
   - **Response Shape**: `{ success, user, session }`
   - **Zod Schema**: None.
   - **Supabase Table**: Calls `exchangeCodeForSession`.

6. **`auth/refresh/route.ts`**
   - **Methods**: `POST`, `OPTIONS`
   - **Auth Check**: None.
   - **Request Shape**: `{ refreshToken }`
   - **Response Shape**: `{ accessToken, refreshToken, expiresAt }`
   - **Zod Schema**: None.
   - **Supabase Table**: Calls `/auth/v1/token` directly using Node fetch.

7. **`avatar/upload/route.ts`**
   - **Methods**: `POST`, `OPTIONS`
   - **Auth Check**: Both Bearer (extension) and Cookies (web) supported.
   - **Request Shape**: `FormData` with `avatar` (max 1MB).
   - **Response Shape**: `{ avatar_url }`
   - **Zod Schema**: None.
   - **Supabase Table**: Storage `avatars` and updates `users` table.

8. **`chats/extension/route.ts`**
   - **Methods**: `POST`, `OPTIONS`
   - **Auth Check**: `X-Extension-Key` and `Authorization: Bearer <token>`, uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - **Request Shape**: `{ title, content, platform, url, folder_id }`
   - **Response Shape**: Chat data.
   - **Zod Schema**: None. Data passed straight to Supabase.
   - **Supabase Table**: `chats` (insert)

9. **`chats/route.ts`**
   - **Methods**: `GET`, `POST`, `PUT`, `DELETE`
   - **Auth Check**: Both Bearer and Cookies.
   - **Request Shape**: Object matching schemas, or comma-separated `ids` for DELETE.
   - **Response Shape**: Arrays or single parsed objects. POST checks for duplicates and downgrades.
   - **Zod Schema**: `createChatSchema`, `updateChatSchema` (from `@brainbox/validation`).
   - **Supabase Table**: `chats`.

10. **`export/route.ts`**
    - **Methods**: `GET`
    - **Auth Check**: Cookies (web).
    - **Request Shape**: None.
    - **Response Shape**: JSON text file payload (`chats`, `folders`).
    - **Zod Schema**: None.
    - **Supabase Table**: `chats`, `folders`.

11. **`folders/route.ts`**
    - **Methods**: `GET`, `PUT`, `DELETE`, `POST`
    - **Auth Check**: Both Bearer and Cookies conditionally in each handler.
    - **Request Shape**: Matching inline zod schemas. Folder ID.
    - **Response Shape**: Folder data or arrays.
    - **Zod Schema**: Inline `createFolderSchema`, `updateFolderSchema`.
    - **Supabase Table**: `folders`. Prevents circular references in PUT.

12. **`images/route.ts`**
    - **Methods**: `GET`, `POST`, `OPTIONS`
    - **Auth Check**: Both Bearer and Cookies inline.
    - **Request Shape**: `{ images: [] }` or `{ url, title, ... }`.
    - **Response Shape**: Inserted array of items or fetch items.
    - **Zod Schema**: None.
    - **Supabase Table**: `images`, Storage `images`.

13. **`import/route.ts`**
    - **Methods**: `POST`
    - **Auth Check**: Cookies (web).
    - **Request Shape**: `{ chats: [...], folders: [...] }`.
    - **Response Shape**: `{ success: true, imported: { chats, folders } }`
    - **Zod Schema**: None.
    - **Supabase Table**: Bulk insert into `folders` and `chats`.

14. **`prompts/by-category/route.ts`**
    - **Methods**: `GET`
    - **Auth Check**: None.
    - **Request Shape**: Search param `category`.
    - **Response Shape**: Prompts JSON.
    - **Zod Schema**: None.
    - **Supabase Table**: None directly, calls `SmartPromptSearch`.

15. **`prompts/categories/route.ts`**
    - **Methods**: `GET`
    - **Auth Check**: None.
    - **Request Shape**: None.
    - **Response Shape**: Categories JSON array.
    - **Zod Schema**: None.
    - **Supabase Table**: None directly, calls `SmartPromptSearch`.

16. **`prompts/proxy-csv/route.ts`**
    - **Methods**: `GET`
    - **Auth Check**: None.
    - **Request Shape**: None.
    - **Response Shape**: Returns `text/csv` from GitHub.
    - **Zod Schema**: None.
    - **Supabase Table**: None.

17. **`prompts/route.ts`**
    - **Methods**: `GET`, `PUT`, `POST`
    - **Auth Check**: Mix of Cookies implicitly, and mixed inline Auth checking.
    - **Request Shape**: `use_in_context_menu` filter, body updates/creates.
    - **Response Shape**: Prompts arrays / objects.
    - **Zod Schema**: `createPromptSchema`, `updatePromptSchema` (`@brainbox/validation`).
    - **Supabase Table**: `prompts`.

18. **`prompts/search/route.ts`**
    - **Methods**: `POST`
    - **Auth Check**: None.
    - **Request Shape**: `{ query: string }`.
    - **Response Shape**: Filtered matches JSON.
    - **Zod Schema**: Inline `searchSchema`.
    - **Supabase Table**: `SmartPromptSearch`.

19. **`proxy-image/route.ts`**
    - **Methods**: `GET`, `POST`, `OPTIONS`
    - **Auth Check**: None.
    - **Request Shape**: `url` search query or `imageUrl` in body.
    - **Response Shape**: Buffer (Content-Type header).
    - **Zod Schema**: None. Security validates HTTP/HTTPS protocols.
    - **Supabase Table**: None.

20. **`stats/route.ts`**
    - **Methods**: `GET`, `OPTIONS`
    - **Auth Check**: Both Bearer and Cookies inline.
    - **Request Shape**: None.
    - **Response Shape**: `{ user, stats }`
    - **Zod Schema**: None.
    - **Supabase Table**: Parallel counts of `chats`, `folders`, `prompts`, `images`, and single `users` lookup.

21. **`upload/route.ts`**
    - **Methods**: `POST`
    - **Auth Check**: Both Bearer and Cookies.
    - **Request Shape**: `FormData` with `file` (max 2MB), `folderId`.
    - **Response Shape**: Image record.
    - **Zod Schema**: None.
    - **Supabase Table**: Storage `images` and db `images`.

22. **`user/settings/route.ts`**
    - **Methods**: `GET`, `PUT`
    - **Auth Check**: Cookies (web) only.
    - **Request Shape**: `{ settings }`.
    - **Response Shape**: `{ settings }`.
    - **Zod Schema**: None.
    - **Supabase Table**: `users` (updates config JSON).


## §2 Zustand Stores

### `useChatStore` (`src/store/useChatStore.ts`)
- **State shape**:
  - `chats`: `Chat[]`
  - `selectedChatId`: `string | null`
  - `selectedChatIds`: `Set<string>`
  - `isLoading`: `boolean`
- **Actions**:
  - Pure state mutations: `setChats`, `addChat`, `toggleChatSelection`, `selectAllChats`, `deselectAllChats`, `selectChat`, `setLoading`.
  - API calls:
    - `updateChat(id, updates)`: Calls `PUT /api/chats`. **Flawed Optimistic Pattern**: The update is not applied *before* the request. Instead, if the request succeeds, it applies the server response. If it *fails*, it catches the error and then applies the `updates` locally. This is backwards.
    - `deleteChat(id)`, `deleteChats(ids)`: Calls `DELETE /api/chats`. Only mutates state upon `response.ok`. No optimistic update.
- **Persistence**: No `persist` middleware. State is lost on refresh and re-hydrated elsewhere.

### `useFolderStore` (`src/store/useFolderStore.ts`)
- **State shape**:
  - `folders`: `Folder[]`
  - `selectedFolderId`: `string | null`
  - `isLoading`: `boolean`
- **Actions**:
  - Pure mutations: `setFolders`, `addFolder`, `selectFolder`, `setLoading`.
  - API calls:
    - `updateFolder(id, updates)`: Calls `PUT /api/folders`. Uses the same flawed "Optimistic update on error" pattern as `useChatStore`.
    - `deleteFolder(id)`: Calls `DELETE /api/folders?id=id`. Also has a flawed "Optimistic delete on error" pattern where it deletes locally even if the server request fails.
- **Persistence**: No `persist` middleware.

### `useImageStore` (`src/store/useImageStore.ts`)
- **State shape**:
  - `images`: `Image[]`
  - `selectedImageIds`: `Set<string>`
  - `isLoading`: `boolean`
  - `uploadQueue`: `UploadItem[]`
- **Actions**:
  - Pure mutations: `setImages`, `addImage`, `updateImage`, `deleteImage`, bulk selection methods, and queue methods (`addToUploadQueue`, `updateUploadProgress`, `removeFromUploadQueue`).
  - Remote calls (Directly uses Supabase Client instead of API routes):
    - `fetchImages`: `supabase.from('images').select(...)`.
    - `deleteImages(ids)`: Deletes from storage then DB directly, updates state on success.
    - `moveImages`: Updates DB directly, applies local update on success.
- **Persistence**: No `persist` middleware.

### `useListStore` (`src/store/useListStore.ts`)
- **State shape**:
  - `lists`: `ListWithItems[]`
  - `selectedListId`: `string | null`
  - `isLoading`: `boolean`
- **Actions**:
  - `setLists`, `addList`, `updateList`, `deleteList`, `selectList`, item CRUD operations (`addItemToList`, `updateItemInList`, `deleteItemFromList`).
  - **No API calls**: Only local mutations. Persistence must be handled by components.
- **Persistence**: No `persist` middleware.

### `usePromptStore` (`src/store/usePromptStore.ts`)
- **State shape**:
  - `prompts`: `Prompt[]`
  - `selectedPromptIds`: `string[]` // Note: Array, not Set unlike other stores
  - `isLoading`: `boolean`
- **Actions**:
  - Pure mutations: `setPrompts`, `addPrompt`, `deletePrompt` (has no API call, pure local), `togglePromptSelection`, `clearSelection`.
  - API calls:
    - `updatePrompt(id, updates)`: Calls `PUT /api/prompts`. Uses flawed "Optimistic update on error" pattern.
- **Persistence**: No `persist` middleware.

### Notes on `useShallow`
- The store definition files do not use `useShallow`. Consumers of these stores must wrap selectors with `useShallow` to prevent unnecessary re-renders. This will be checked in the Component Tree step.


## §3 DataProvider & Supabase

### `DataProvider.tsx` (`src/components/providers/DataProvider.tsx`)
- **Role**: At the root of the authenticated experience, this component handles data hydration and real-time synchronization for `folders`, `prompts`, and `chats`.
- **Hydration Strategy**:
  - Exposes a `fetchData` function wrapped in `useCallback` with a locking mechanism (`isFetchingRef`) to prevent duplicate execution.
  - Fetches core data using `Promise.allSettled`.
  - **Inconsistency**: Fetches `/api/chats` and `/api/folders` using the Next.js API routes, but fetches `prompts` directly using the Supabase client SDK (`supabase.from('prompts').select(...)`). This bypasses the API layer.
- **Real-time Sync**:
  - Subscribes to Supabase Auth state (`SIGNED_IN`, `SIGNED_OUT`) to refetch or clear stores.
  - Subscribes to Supabase Channels (`postgres_changes` on `folders`, `prompts`, `chats`).
  - Correctly intercepts `INSERT`, `UPDATE`, and `DELETE` events.
  - **Duplicate Prevention**: For `INSERT`, it checks if the record already exists in the store to avoid double-adding items creating optimistically in the UI.

### Supabase Clients
- **`client.ts` (`src/lib/supabase/client.ts`)**:
  - Implements `createBrowserClient` with custom cookie handling.
  - Reads `brainbox_remember_me` from `localStorage` safely (handling blocked cross-origin errors).
  - Intercepts `auth-token` cookie setting: if `rememberMe` is true, overrides the `maxAge` to 30 days, creating persistent sessions.
- **`server.ts` (`src/lib/supabase/server.ts`)**:
  - Implements `createServerClient` for server environments.
  - Wraps the cookie `set` and `remove` calls in `try/catch` blocks. This correctly handles the Next.js Server Component limitation where cookies cannot be mutated once the server starts streaming the response.


## §4 Component Tree

### Architectural Patterns
The component architecture in `apps/dashboard/src/components` is feature-driven. Components are grouped by domains like `/features/chats`, `/features/folders`, `/features/prompts`, and `/layout`.

- **Fat Components vs Presentation Components**: The dashboard relies heavily on "Fat Components" (Smart Components). For example, `ChatCard.tsx` contains complex state (Zustand connections, API calls for AI Analysis, editing state, and drag-and-drop state). There is a lack of strict separation between Container (logic) and Presentational (UI) components. 
- **HybridSidebar**: A complex layout component that handles routing logic, Zustand store subscriptions, and complex rendering logic like the "Smart 5" folder expansion limit (`getDisplayItems`). 

### Performance & Re-renders (`useShallow`)
Zustand's default behavior triggers a re-render whenever *any* part of the selected state changes if you destructure directly.

- **Good Practices Observed**:
  - `HybridSidebar` and `ChatActionMenu` properly utilize `useShallow` when fetching arrays from the store: `const folders = useFolderStore(useShallow(s => s.folders));`. This prevents the component from re-rendering just because `isLoading` or `selectedFolderId` changed.
- **Bad Practices (Anomalies) Observed**:
  - Several components bypass `useShallow` entirely and subscribe to the entire store. 
  - `GlobalBrain`, `ChatStudio`: Destructures `chats` from `useChatStore`.
  - `ImagesPage`, `FolderHeader`: Destructures fully from `useFolderStore`.
  - `CreatePromptModal`, `DailyPromptCard`, `PromptCard`: Destructures fully from `usePromptStore`.
  - This pattern causes widespread unnecessary re-renders across the dashboard when unrelated store states mutate.


## §5 Element Dictionary

### Global UI Strategy
A critical observation regarding the Dashboard's UI architecture is the **complete absence of a centralized UI component library**. 

- There is no `src/components/ui` folder for reusable atomic components (like Buttons, Inputs, Dialogs, Selects).
- There is no `@brainbox/ui` shared package in the monorepo workspace.
- Components like `ChatCard`, `HybridSidebar`, and `PromptCard` manually implement raw HTML elements (`<button>`, `<input>`, `<div>`) interspersed with extensive, repetitive Tailwind utility strings.
- This results in a highly fragmented UI where design consistency (e.g., focus states, hover transitions, disabled states, and standard spacings) must be manually maintained across every single feature component.

### Shared Feature Components
While atomic UI elements are missing, the project does extract some logic into feature-specific shared components:
- **`LayoutWrapper` & `HybridSidebar`**: Core application shell elements providing responsive navigations and context.
- **`DataProvider` & `SessionBroadcaster`**: Invisible provider elements managing state hydration and auth synchronization.
- **`ChatBadges`, `PlatformIcon`, `ChatActionMenu`**: Granular feature components extracted strictly to avoid overly massive files in the `ChatCard` hierarchy, rather than for horizontal reuse.
- **Icons**: Handled exclusively via `lucide-react`, though some platform-specific logo mappings exist via `@brainbox/assets`.


## §6 Anomalies & Risks

The following architectural and implementation anomalies pose risks to application stability, performance, and maintainability.

### 1. Inverted "Optimistic" Store Updates
Across `useChatStore`, `useFolderStore`, and `usePromptStore`, the "optimistic update" paradigm is dangerously inverted.
```typescript
try {
  const response = await fetch('/api/chats', { method: 'PUT', body });
  // Updates local state using the server response upon success 
} catch (error) {
  // 🚨 ANOMALY: Applies the 'updates' locally if the operation FAILS
  set(state => /* updates local chat with failed mutations */);
  throw error;
}
```
**Risk**: If an update or delete request fails, the local UI state will incorrectly reflect the mutation as successful until the page is refreshed, causing severe data desynchronization for the user.

### 2. Inconsistent API Route Patterns vs `DataProvider` Bypass
- The dashboard utilizes Next.js App Router API Routes (`/api/*`) for data mutations and hydration.
- **Anomaly**: `DataProvider.tsx` uses `fetch('/api/chats')` and `fetch('/api/folders')` for hydration, but bypasses the API completely to fetch prompts using `supabase.from('prompts').select('*')` directly. This fragments data-fetching logic and bypasses any server-side validation or interceptors that might be added to the Next.js API route layer.

### 3. Widespread `useShallow` Misuse (Performance Degradation)
Zustand stores export large state trees.
- **Anomaly**: Many intensive components (e.g., `GlobalBrain.tsx`, `ChatStudio.tsx`, `ImagesPage.tsx`, `CreatePromptModal.tsx`) destructure state directly (`const { chats } = useChatStore();`).
- **Risk**: Any change to *any* property in `useChatStore` (e.g., `isLoading`, `selectedChatIds`) will trigger a full re-render of massive dashboard elements like the `GlobalBrain` and `ChatStudio`.

### 4. Missing Centralized UI Package
- **Anomaly**: The monorepo heavily uses shared `@brainbox/shared`, `@brainbox/database`, and `@brainbox/validation` packages, but entirely lacks a UI primitive package or even a `src/components/ui` folder.
- **Risk**: Extreme code duplication. Standard interactive states (focus rings, hover states, ARIA descriptions) for basic elements (Buttons, Inputs, Modals) are recreated constantly using massive inline Tailwind strings in feature components like `ChatCard.tsx` and `HybridSidebar.tsx`.

### 5. Fragmented Schema Validation
- **Anomaly**: While some API routes properly consume centralized schemas from `@brainbox/validation` (e.g., `chats/route.ts` using `createChatSchema`), several routes implement one-off inline schemas using `z.object({...})` directly inside the file (e.g., `ai/search/route.ts`, `folders/route.ts`).
- **Risk**: Drifting constraints. The `Folder` type validation in the API may not match the actual Supabase DB constraints or the TypeScript interfaces.

### 6. Fragile Real-time State Mutation
- **Anomaly**: The `DataProvider.tsx` channel subscriber for `chats` `UPDATE` events directly calls `useChatStore.setState(...)` outside of an action method in the store. 
- **Risk**: State updates are scattered outside the centralized store actions. Doing this prevents tracking, state-diffing middleware (like Redux DevTools), or logging, breaking the encapsulation of the Zustand store's capabilities.

