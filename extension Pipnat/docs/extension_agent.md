# Extension Agent - Personal Documentation

**Agent:** EXTENSION_AGENT  
**Role:** Chrome Extension Development  
**Log:** `docs/agents/logs/extension_agent.log`

---

## What Works

### Platform Detection
```javascript
const platform = 
  url.includes('chatgpt.com') ? 'chatgpt' :
  url.includes('claude.ai') ? 'claude' :
  url.includes('gemini.google.com') ? 'gemini' :
  'lmarena';
```
**Status:** WORKS on all 4 platforms

---

## What Doesn't Work

### Issue: ChatGPT changed selectors (2025-01-10)
**Problem:** `[data-message-author-role]` no longer exists  
**Solution:** Updated to new selector structure

---

### Issue: Menu positioning off-screen
**Problem:** Menu appears outside viewport on narrow screens  
**Solution:** Check `spaceRight` and position left/right accordingly

---

### Issue: Claude org_id extraction (2025-01-27)
**Problem:** org_id not always in URL, causing "Could not extract organization ID" error  
**Solution:** Implemented webRequest listener to intercept API calls and extract org_id per specification pattern "/api/organizations/([^/]+)/". Cached per session.

---

### Issue: chrome.tabs.create in content scripts (2025-01-27)
**Problem:** "Cannot read properties of undefined (reading 'create')" - chrome.tabs not available in content scripts  
**Solution:** Added "tabs" permission to manifest.json and created openLoginPage handler in service worker. Content scripts now use chrome.runtime.sendMessage({ action: 'openLoginPage' })

---

### Issue: ChatGPT hover menu re-implemented on <span> elements (2025-01-27)
**Problem:** ChatGPT hover menu had persistent issues with buttons disappearing and conversations "running away" when attached to <a> elements  
**Solution:** Re-implemented hover menu to work on <span> elements (title text) inside conversation links instead of <a> elements  
**Status:** ✅ WORKING - Hover listeners attached to `span.opacity-60` elements, buttons stay visible when hovering over parent <a> or buttons  
**Note:** ⚠️ Minor visual improvements needed (button styling/positioning), but target elements (<span>) should NOT be changed

---

## Size History

```
2025-01-15: 21.2KB ✓
2025-01-10: 23.8KB ✓
2025-01-05: 19.5KB ✓
```

Target: < 25KB

---

## Platform-Specific Notes

### ChatGPT
- Fastest DOM structure
- Message streaming supported
- Code blocks well-formatted
- Hover menu works on <span> elements (2025-01-27) - attached to title text spans inside conversation links
- Context menu available for saving conversations
- ⚠️ Minor visual improvements needed (fade animations per spec), but target elements (<span>) should NOT be changed

### Claude
- Clean HTML structure
- Good for extraction
- Sometimes lazy-loads content
- org_id not always in page URL - must intercept API calls
- Uses cookie-based authentication (session-key)

### Gemini
- Similar to ChatGPT
- Different class names
- Good image support
- Hover menu works on <span> elements (2025-01-27) - attached to title text spans inside conversation links (like ChatGPT)
- Fade animations implemented per specification (fade_in 150ms ease-out, fade_out 100ms ease-in)
- ⚠️ MutationObserver DISABLED (2025-01-27) - Only initial button injection on page load, no dynamic observation
- ⚠️ Hover buttons only work for conversations already loaded - New conversations added dynamically won't get hover buttons
- Authentication check added in handleSave - Opens login page if accessToken missing/expired
- ✅ Title extraction improved (2025-01-28) - New function `extractTitleFromConversationDiv` precisely extracts titles from `.conversation-title` div, handling nested child divs
- ✅ Title priority fixed (2025-01-28) - domData.title now has priority over request title to prevent "Google Gemini" generic title
- ✅ Debug logging added (2025-01-28) - Extensive logging for title extraction debugging

### LMArena
- Two-column layout
- Need to detect active side
- Comparison mode tricky

---

*Last updated: 2025-01-28 00:00*
