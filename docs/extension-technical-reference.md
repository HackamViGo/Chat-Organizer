# BrainBox Chrome Extension - Technical Reference Manual

**Version**: 1.0.0  
**Last Updated**: 2025-12-23  
**Purpose**: AI-readable technical documentation for BrainBox extension architecture, implementation, and troubleshooting

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Component Details](#component-details)
3. [Data Flow Diagrams](#data-flow-diagrams)
4. [API Integration](#api-integration)
5. [Known Issues & Solutions](#known-issues--solutions)
6. [Implementation History](#implementation-history)
7. [Testing & Debugging](#testing--debugging)

---

## Architecture Overview

### High-Level Structure
```
BrainBox Extension
├── Manifest V3 Chrome Extension
├── Content Scripts (injected into AI platforms)
├── Background Service Worker (API communication)
├── Popup UI (dashboard)
└── Extension Auth Page (token capture)
```

### Technology Stack
- **Extension**: Chrome Manifest V3, Vanilla JavaScript
- **Backend**: Next.js 14 (App Router), TypeScript
- **Database**: Supabase (PostgreSQL + Auth)
- **Deployment**: Vercel (backend), Chrome Web Store (extension)

### Supported Platforms
1. **ChatGPT** (`chatgpt.com`, `chat.openai.com`)
2. **Claude** (`claude.ai`)
3. **Gemini** (`gemini.google.com`)
4. **LMArena** (`lmarena.ai`, `chat.lmsys.org`)

---

## Component Details

### 1. Content Script (`extension/content-script.js`)

**Purpose**: Injected into AI platform pages to extract chat content and images

**Key Functions**:

#### Platform Detection
```javascript
function detectCurrentPlatform() {
  const hostname = window.location.hostname;
  // Returns: 'ChatGPT' | 'Claude' | 'Gemini' | 'LMArena' | 'Unknown'
}
```

#### Chat Extraction Pipeline
```javascript
extractChatData() 
  → extractChatTitle()      // Platform-specific title selectors
  → extractChatContent()    // Routes to platform-specific extractor
    → extractChatGPTMessages()
    → extractClaudeMessages()
    → extractGeminiMessages()
    → extractLMArenaMessages()
```

**Current Implementation Status**:
- ✅ **Claude**: WORKING - Extracts full conversation
- ⚠️ **ChatGPT**: PARTIAL - Saves but content is empty
- ⚠️ **Gemini**: PARTIAL - Saves but content is empty
- ⚠️ **LMArena**: UNTESTED

#### Image Extraction
```javascript
function extractAllImagesFromPage() {
  // Extracts: <img> tags, background-image CSS, canvas elements
  // Returns: Array<string> (image URLs)
}
```

**Current Status**: ⚠️ NOT WORKING - Extraction works but save fails

#### UI Elements Injected
1. **Save Button** - Appears in platform header/nav
2. **Hover Menu** - Quick save to custom folders (on chat hover)
3. **Notifications** - Toast-style feedback messages
4. **Login Modal** - Redirects to auth page

### 2. Background Service Worker (`extension/background.js`)

**Purpose**: Handles API communication, context menus, and message routing

**Key Responsibilities**:
1. **Context Menu Management**
   - "🎯 Save Full Chat to BrainBox" (page context)
   - "📸 Save All Images to BrainBox" (page context)
   - "💾 Save Image to BrainBox" (image context)
   - "⌨️ Insert BrainBox Prompt" (editable context)

2. **API Communication**
   - `handleSaveChat(chatData)` → POST `/api/chats`
   - `handleSaveImage(imageData)` → POST `/api/images`
   - `handleCreateFolder(folderData)` → POST `/api/folders`
   - `fetchFolders()` → GET `/api/folders`
   - `fetchPrompts()` → GET `/api/prompts`

3. **Message Routing**
   ```javascript
   chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
     switch(request.action) {
       case 'saveChat': handleSaveChat(request.data)
       case 'saveImage': handleSaveImage(request.data)
       case 'createFolder': handleCreateFolder(request.data)
       case 'getFolders': fetchFolders()
       case 'getPrompts': fetchPrompts()
     }
   })
   ```

**Authentication Flow**:
```javascript
// Stored in chrome.storage.local:
{
  accessToken: string,    // Supabase JWT
  refreshToken: string,   // For token refresh
  expiresAt: number      // Timestamp
}

// All API calls include:
headers: {
  'Authorization': `Bearer ${accessToken}`
}
```

### 3. Popup UI (`extension/popup.html`, `extension/popup.js`)

**Purpose**: Extension dashboard showing user stats and quick actions

**Views**:
1. **Loading View** - Shown while fetching data
2. **Login View** - Redirects to auth page (if not logged in)
3. **Dashboard View** - Main interface

**Dashboard Components**:
```javascript
// Header
- User avatar
- User name & email
- Connection status indicator (green dot)

// Stats Grid
- Chats count
- Folders count
- Prompts count
- Images count

// Actions
- "Save Current Chat" button (if on supported platform)
- "Open BrainBox" link
- "Log out" button
```

**Data Source**: `GET /api/stats`
```typescript
{
  user: {
    id: string,
    email: string,
    full_name: string,
    avatar_url: string
  },
  stats: {
    chats: number,
    folders: number,
    prompts: number,
    images: number
  }
}
```

### 4. Extension Auth (`extension/extension-auth.js`)

**Purpose**: Captures Supabase access token after OAuth login

**Flow**:
1. User clicks "Login" in extension
2. Opens `${API_BASE_URL}/extension-auth` in new tab
3. User completes OAuth (Google/GitHub)
4. Next.js page sets token in URL hash: `#access_token=...`
5. `extension-auth.js` extracts token from hash
6. Stores in `chrome.storage.local`
7. Closes tab and shows success message

**Implementation**:
```javascript
// Runs on: /extension-auth page
const hash = window.location.hash;
const params = new URLSearchParams(hash.substring(1));
const accessToken = params.get('access_token');

if (accessToken) {
  chrome.storage.local.set({ 
    accessToken,
    refreshToken: params.get('refresh_token'),
    expiresAt: Date.now() + (params.get('expires_in') * 1000)
  });
}
```

---

## Data Flow Diagrams

### Chat Save Flow (Current Implementation)

```
┌─────────────────────────────────────────────────────────────┐
│ USER ACTION: Click "Save to BrainBox" button               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ content-script.js::handleSaveClick()                        │
│ 1. Check accessToken in chrome.storage.local               │
│ 2. If missing → showLoginRequiredModal() → STOP            │
│ 3. Call extractChatData()                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ content-script.js::extractChatData()                        │
│ Returns: {                                                  │
│   url: string,                                              │
│   title: string,                                            │
│   content: string,  ← ⚠️ PROBLEM: Empty for ChatGPT/Gemini│
│   platform: string,                                         │
│   timestamp: string                                         │
│ }                                                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ chrome.runtime.sendMessage()                                │
│ { action: 'saveChat', data: chatData }                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ background.js::handleSaveChat(chatData)                     │
│ 1. Get accessToken from chrome.storage.local               │
│ 2. POST to ${API_BASE_URL}/api/chats                       │
│    Headers: { Authorization: Bearer ${accessToken} }       │
│    Body: chatData                                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Next.js API: /api/chats (route.ts)                         │
│ 1. Extract token from Authorization header                 │
│ 2. Verify user with Supabase                               │
│ 3. Insert into 'chats' table:                              │
│    { user_id, title, content, platform, url, folder_id }   │
│ 4. Return: { id, ...chatData }                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ background.js receives response                             │
│ sendResponse({ success: true, data: result })              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ content-script.js shows notification                        │
│ showNotification('✓ Chat saved successfully!', 'success')  │
│ ⚠️ PROBLEM: Shows success even if content is empty!        │
└─────────────────────────────────────────────────────────────┘
```

### Image Save Flow (Current - BROKEN)

```
┌─────────────────────────────────────────────────────────────┐
│ USER ACTION: Right-click → "Save All Images to BrainBox"   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ background.js::handleAddAllImages(info, tab)               │
│ 1. Send message to content script:                         │
│    { action: 'extractAllImages' }                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ content-script.js::extractAllImagesFromPage()              │
│ Returns: ['https://...img1.png', 'https://...img2.jpg']   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ background.js receives images array                         │
│ Creates bulkData: {                                         │
│   source_url: tab.url,                                      │
│   images: [{ url, name }, { url, name }, ...]              │
│ }                                                           │
│ Calls: handleSaveImage(bulkData)                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ background.js::handleSaveImage(bulkData)                    │
│ POST to ${API_BASE_URL}/api/images                         │
│ Headers: { Authorization: Bearer ${accessToken} }          │
│ Body: bulkData                                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Next.js API: /api/images (route.ts)                        │
│ ⚠️ PROBLEM AREA:                                            │
│ 1. Expects: { images: [{url, name}], source_url }          │
│ 2. Maps to DB format: { user_id, url, name, source_url }   │
│ 3. DB Schema requires: user_id, url, path (NOT NULL)       │
│    ❌ 'path' is missing → INSERT FAILS                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ API returns error (500 or constraint violation)            │
│ background.js catches error                                 │
│ Shows: "✗ Failed to save images"                           │
└─────────────────────────────────────────────────────────────┘
```

---

## API Integration

### Backend Endpoints

#### 1. POST `/api/chats`
**Purpose**: Save chat conversation

**Request**:
```typescript
{
  title: string,
  content: string,      // Full conversation text
  platform: string,     // 'ChatGPT' | 'Claude' | 'Gemini' | 'LMArena'
  url: string,          // Source URL
  folder_id?: string    // Optional folder assignment
}
```

**Authentication**: Bearer token OR cookies

**Response**:
```typescript
{
  id: string,
  user_id: string,
  title: string,
  content: string,
  platform: string,
  url: string,
  folder_id: string | null,
  created_at: string
}
```

**Database Table**: `chats`
```sql
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT,
  content TEXT,
  platform TEXT,
  url TEXT,
  folder_id UUID REFERENCES folders(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. POST `/api/images`
**Purpose**: Save image(s)

**Request Format 1** (Single):
```typescript
{
  url: string,
  name?: string,
  source_url?: string
}
```

**Request Format 2** (Bulk):
```typescript
{
  images: Array<{ url: string, name?: string }>,
  source_url?: string
}
```

**Authentication**: Bearer token OR cookies

**Response**:
```typescript
Array<{
  id: string,
  user_id: string,
  url: string,
  name: string,
  source_url: string,
  created_at: string
}>
```

**Database Table**: `images`
```sql
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  url TEXT NOT NULL,
  path TEXT,              -- ⚠️ Was NOT NULL, now nullable
  name TEXT,
  source_url TEXT,
  mime_type TEXT,
  size BIGINT,
  folder_id UUID REFERENCES folders(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Recent Migration**:
```sql
-- Applied: 2025-12-23
ALTER TABLE public.images ALTER COLUMN path DROP NOT NULL;
ALTER TABLE public.images ADD COLUMN IF NOT EXISTS source_url TEXT;
```

#### 3. GET `/api/stats`
**Purpose**: User dashboard statistics

**Authentication**: Bearer token OR cookies

**Response**:
```typescript
{
  user: {
    id: string,
    email: string,
    full_name: string,
    avatar_url: string
  },
  stats: {
    chats: number,
    folders: number,
    prompts: number,
    images: number
  }
}
```

**Implementation**: Parallel count queries
```typescript
const [chatsCount, foldersCount, promptsCount, imagesCount] = await Promise.all([
  supabase.from('chats').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
  supabase.from('folders').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
  supabase.from('prompts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
  supabase.from('images').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
]);
```

#### 4. GET/POST `/api/folders`
**Purpose**: Folder management

**GET Response**:
```typescript
{
  folders: Array<{
    id: string,
    user_id: string,
    name: string,
    color: string,
    type: string,
    icon: string,
    created_at: string
  }>
}
```

**POST Request**:
```typescript
{
  name: string,
  color?: string,
  type?: string,
  icon?: string
}
```

#### 5. GET `/api/prompts`
**Purpose**: Fetch saved prompts for insertion

**Response**:
```typescript
{
  prompts: Array<{
    id: string,
    title: string,
    content: string,
    category: string
  }>
}
```

---

## Known Issues & Solutions

### Issue 1: Empty Chat Content (ChatGPT & Gemini)

**Symptom**: Extension shows "✓ Chat saved successfully!" but database has empty `content` field

**Root Cause**: DOM selectors are outdated or too specific

**ChatGPT Selector Issues**:
```javascript
// Current (BROKEN):
const articles = document.querySelectorAll('article');
// Problem: May not find articles, or finds wrong elements

// Current role detection (BROKEN):
const isUser = article.innerText.includes('You\n');
// Problem: Doesn't work in non-English locales
```

**Gemini Selector Issues**:
```javascript
// Current (BROKEN):
const messageElements = document.querySelectorAll('.message-content, message-content');
// Problem: Google changes class names frequently
```

**Solution Strategy**:
1. Multi-strategy fallback approach
2. Attribute-based detection (more stable than classes)
3. Locale-independent role detection
4. Content validation before save

**Planned Fix**: See `implementation_plan.md` Phase 2

### Issue 2: Image Saving Fails

**Symptom**: Right-click "Save All Images" shows error or no feedback

**Root Causes**:
1. **Database Schema**: `path` column was NOT NULL but extension doesn't provide it
2. **API Format Mismatch**: `handleSaveImage()` expects single image, receives bulk
3. **No User Feedback**: Silent failures

**Evidence**:
```javascript
// background.js sends:
{
  source_url: "https://chatgpt.com/...",
  images: [{ url: "...", name: "..." }]
}

// But handleSaveImage() was designed for:
{
  url: "...",
  title: "...",
  source_url: "..."
}
```

**Solution Applied**:
- ✅ Database migration: Made `path` nullable
- ⚠️ Need to verify migration applied
- ⚠️ Need to fix API route to handle both formats
- ⚠️ Need to add error logging

**Planned Fix**: See `implementation_plan.md` Phase 3

### Issue 3: No Validation Before Save

**Symptom**: User sees "success" even when content is empty

**Root Cause**: No validation in `handleSaveClick()`

**Current Code**:
```javascript
async function handleSaveClick() {
  const chatData = extractChatData();
  // ❌ No check if content is empty!
  
  const response = await chrome.runtime.sendMessage({
    action: 'saveChat',
    data: chatData
  });
  
  if (response && response.success) {
    showNotification('✓ Chat saved successfully!', 'success');
    // ❌ Shows success even if content is "No conversation content extracted"
  }
}
```

**Solution**: Add validation
```javascript
if (!chatData.content || chatData.content === 'No conversation content extracted') {
  showNotification('⚠️ No chat content found', 'error');
  return;
}
```

**Planned Fix**: See `implementation_plan.md` Phase 1

### Issue 4: No Debug Logging

**Symptom**: Hard to diagnose extraction failures

**Root Cause**: Minimal console logging

**Current Logging**:
```javascript
// Only these logs exist:
console.log('AI Chat Organizer extension loaded on', PLATFORM);
console.warn(`[BrainBox] No messages extracted for platform: ${PLATFORM}`);
console.log(`[BrainBox] Extracted ${messages.length} messages from ${PLATFORM}`);
```

**Solution**: Add comprehensive logging at each step
- Extraction start/end
- Selector results
- API request/response
- Error details

**Planned Fix**: See `implementation_plan.md` Phase 1

---

## Implementation History

### 2025-12-22: Initial Extension Development
- Created Manifest V3 extension structure
- Implemented content script with platform detection
- Added background service worker
- Created popup UI with basic functionality

### 2025-12-22: Authentication Flow
- Implemented OAuth token capture via `/extension-auth`
- Added token storage in `chrome.storage.local`
- Created automatic login redirect when unauthenticated

### 2025-12-23: Premium Dashboard
- Redesigned popup to show user stats
- Added `/api/stats` endpoint
- Implemented connection status indicator
- Added "Save Current Chat" button in popup

### 2025-12-23: Context Menu Improvements
- Renamed menu items for clarity
- Removed nested submenus (flattened structure)
- Added emoji icons for visual distinction
- Simplified to 4 main actions

### 2025-12-23: Image Saving Attempt
- Created `/api/images` endpoint
- Added bulk image support in API
- Implemented `extractAllImagesFromPage()`
- **Status**: Not working due to schema/format issues

### 2025-12-23: Chat Extraction Improvements
- Updated selectors for ChatGPT, Claude, Gemini, LMArena
- Added fallback strategies
- Added console logging for debugging
- **Status**: Works for Claude, fails for ChatGPT/Gemini

### 2025-12-23: Database Migrations
- Made `images.path` column nullable
- Added `images.source_url` column
- Updated RLS policies for images

### 2025-12-23 (Current): Analysis & Planning
- Comprehensive issue analysis
- Created implementation plan
- Identified root causes of failures

---

## Testing & Debugging

### Manual Testing Checklist

#### Chat Saving
- [ ] Open ChatGPT, start conversation
- [ ] Open DevTools (F12), check Console tab
- [ ] Click extension icon → "Save Current Chat"
- [ ] Verify console logs show extraction details
- [ ] Check notification message
- [ ] Verify in database: `SELECT * FROM chats ORDER BY created_at DESC LIMIT 1;`
- [ ] Confirm `content` field is not empty

#### Image Saving
- [ ] Open ChatGPT with images in conversation
- [ ] Right-click on page → "Save All Images to BrainBox"
- [ ] Check console for extraction logs
- [ ] Verify notification shows count
- [ ] Check database: `SELECT * FROM images ORDER BY created_at DESC LIMIT 5;`
- [ ] Confirm URLs are saved

#### Authentication
- [ ] Clear extension data: `chrome.storage.local.clear()`
- [ ] Click extension icon
- [ ] Should redirect to `/extension-auth`
- [ ] Complete OAuth login
- [ ] Verify token stored: `chrome.storage.local.get(['accessToken'])`
- [ ] Popup should show dashboard

### Debug Commands

**Check stored auth**:
```javascript
chrome.storage.local.get(['accessToken', 'expiresAt'], (result) => {
  console.log('Token:', result.accessToken?.substring(0, 20) + '...');
  console.log('Expires:', new Date(result.expiresAt));
  console.log('Expired?', Date.now() > result.expiresAt);
});
```

**Test extraction manually**:
```javascript
// In DevTools console on ChatGPT page:
const articles = document.querySelectorAll('article');
console.log('Found articles:', articles.length);
articles.forEach((a, i) => {
  console.log(`Article ${i}:`, a.innerText.substring(0, 100));
});
```

**Check API response**:
```javascript
// In background.js or DevTools:
fetch('https://brainbox-alpha.vercel.app/api/stats', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN_HERE' }
})
.then(r => r.json())
.then(console.log);
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Unauthorized" | Token missing or expired | Clear storage, re-authenticate |
| "No conversation content extracted" | Selectors don't match DOM | Update extractors |
| "Failed to save image" | Schema constraint violation | Check `path` column nullable |
| "Session expired" | Token expired | Implement token refresh |
| Silent failure (no error) | Missing error handling | Add try/catch + logging |

---

## File Structure Reference

```
extension/
├── manifest.json           # Extension configuration
├── background.js          # Service worker (API calls, context menu)
├── content-script.js      # Injected into AI platforms (extraction)
├── content-styles.css     # Styles for injected UI
├── popup.html            # Extension popup UI
├── popup.js              # Popup logic
├── extension-auth.js     # Token capture script
└── icons/                # Extension icons

src/app/api/
├── chats/route.ts        # Chat CRUD endpoints
├── images/route.ts       # Image CRUD endpoints
├── stats/route.ts        # Dashboard statistics
├── folders/route.ts      # Folder management
└── prompts/route.ts      # Prompt management
```

---

## Next Steps (Planned)

1. **Phase 1: Enhanced Feedback** (Priority: CRITICAL)
   - Add detailed console logging
   - Validate content before save
   - Show extraction preview to user

2. **Phase 2: Fix Chat Extraction** (Priority: HIGH)
   - Update ChatGPT selectors
   - Update Gemini selectors
   - Test on real conversations

3. **Phase 3: Fix Image Saving** (Priority: HIGH)
   - Verify database migration
   - Fix API format handling
   - Add UI buttons for image save

4. **Phase 4: Polish** (Priority: MEDIUM)
   - Add progress indicators
   - Improve error messages
   - Add retry logic

---

## Debugging Tips for AI

When troubleshooting this extension:

1. **Always check console logs first** - Both in content script (page DevTools) and background script (extension DevTools)

2. **Verify DOM structure** - AI platforms change their HTML frequently. Use `document.querySelectorAll()` to test selectors

3. **Check authentication** - Most failures are due to expired/missing tokens

4. **Test extraction independently** - Run extraction functions in console before testing full save flow

5. **Validate API responses** - Check Network tab in DevTools for actual API errors

6. **Database schema** - Always verify column constraints match what API sends

7. **RLS policies** - Ensure Supabase RLS allows the operation for the user

---

**END OF DOCUMENT**
