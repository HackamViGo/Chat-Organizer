# Extension Agent Rules

**Agent:** EXTENSION_AGENT  
**Log:** `docs/agents/logs/extension_agent.log`  
**Language:** English (code & logs), Bulgarian (user comm)

---

## Mission

Maintain Chrome Extension for 4 AI platforms: ChatGPT, Claude, Gemini, LMArena.

---

## Size Constraints (HARD LIMITS)

```
TOTAL: < 25KB (excluding icons)
- background.js: < 5KB
- content-script.js: < 8KB  
- popup.js: < 4KB
- popup.html: < 3KB
- content-styles.css: < 4KB
```

**Check:** `du -sh extension/* | sort -h`

---

## Platform Support (ALL 4 REQUIRED)

```javascript
PLATFORMS = {
  chatgpt: ['chatgpt.com', 'chat.openai.com'],
  claude: ['claude.ai'],
  gemini: ['gemini.google.com'],
  lmarena: ['lmarena.ai', 'chat.lmsys.org']
}
```

**Test on ALL before marking task complete.**

---

## Manifest V3 Compliance

- `manifest_version: 3` (NON-NEGOTIABLE)
- Minimal permissions only
- Specific host_permissions (no wildcards)
- Service worker for background (no persistent)

---

## Code Patterns

### Content Extraction
```javascript
function extractContent(platform) {
  const extractors = {
    chatgpt: () => { /* selector logic */ },
    claude: () => { /* selector logic */ },
    gemini: () => { /* selector logic */ },
    lmarena: () => { /* selector logic */ }
  };
  return extractors[platform]?.() || [];
}
```

### Hover Menu (500ms delay)
```javascript
let hoverTimer;
element.addEventListener('mouseenter', () => {
  hoverTimer = setTimeout(() => showMenu(), 500);
});
element.addEventListener('mouseleave', () => {
  clearTimeout(hoverTimer);
});
```

### Quick Access (MAX 3 folders)
```javascript
chrome.storage.local.get(['quickAccessFolders'], (result) => {
  const folders = (result.quickAccessFolders || []).slice(0, 3);
});
```

---

## API Communication

```javascript
const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

async function saveChat(data) {
  const response = await fetch(`${API_BASE}/api/chats/extension`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data)
  });
  
  if (!response.ok) throw new Error('Save failed');
  return response.json();
}
```

---

## Logging Format

```
[TIMESTAMP] [ACTION] [STATUS] [DETAILS]

Examples:
[2025-01-15T14:30:22Z] [SCRAPE_CHATGPT] [SUCCESS] 15 messages extracted
[2025-01-15T14:31:05Z] [HOVER_MENU] [FAIL] Element not found
[2025-01-15T14:32:00Z] [SIZE_CHECK] [WARN] content-script.js 7.8KB
```

---

## Before Any Change

1. Read `docs/agents/logs/extension_agent.log`
2. Read `docs/agents/agent_document.md`
3. Check current extension size
4. Identify affected platforms

---

## After Any Change

1. Log to `docs/agents/logs/extension_agent.log`
2. If affects API → Update `docs/agents/agent_document.md`
3. Test on ALL 4 platforms
4. Verify size: `du -sh extension/*`

---

## Cross-Agent Impacts

**Write to `docs/agents/agent_document.md` when:**
- Adding new API endpoint usage
- Changing data structure sent to backend
- Modifying authentication flow
- Adding new chrome.storage keys

**Format:**
```
[2025-01-15T14:30] [EXTENSION] New field 'platform_version' added to chat payload
Impact: API_AGENT must handle new field
Status: PENDING
```

---

## Testing Checklist

```
□ ChatGPT hover menu works
□ Claude hover menu works  
□ Gemini hover menu works
□ LMArena hover menu works
□ Context menu functional
□ Quick Access shows (max 3)
□ Image save works
□ Size < 25KB total
□ No console errors
```

---

## Common Failures & Fixes

**Selector broke:**
- Platform changed DOM
- Find new selector in DevTools
- Add fallback selector
- Log in docs/agents/logs/extension_agent.log

**Size exceeded:**
- Minify code
- Remove console.logs
- Combine similar functions
- Log warning at 24KB

**Auth failed:**
- Check cookie/token passing
- Verify credentials: 'include'
- Test with fresh login
- Coordinate with API_AGENT

---

## Never Do

- ❌ Use React/Vue in extension
- ❌ Import large libraries
- ❌ Hardcode API URLs
- ❌ Expose API keys
- ❌ Create SQL in extension
- ❌ Skip size check
- ❌ Test on only 1 platform

---

## Response Template

```
✓ Acknowledged: [What I understand]
→ Action: [What I'm doing - 1 sentence]
→ Files: [What I'm modifying]

[CODE]

→ Logged: [Log entry made]
→ Tested: [Which platforms checked]
```

Keep it SHORT. No repetition.