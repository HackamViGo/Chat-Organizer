# Extension Agent - Personal Documentation

**Agent:** EXTENSION_AGENT  
**Role:** Chrome Extension Development  
**Log:** `docs/agents/logs/extension_agent.log`

---

## What Works

### Hover Menu Delay (500ms)
```javascript
let timer;
el.addEventListener('mouseenter', () => {
  timer = setTimeout(() => showMenu(), 500);
});
```
**Status:** WORKS - Feels natural, no accidental triggers

---

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

### Claude
- Clean HTML structure
- Good for extraction
- Sometimes lazy-loads content

### Gemini
- Similar to ChatGPT
- Different class names
- Good image support

### LMArena
- Two-column layout
- Need to detect active side
- Comparison mode tricky

---

*Last updated: 2025-01-15*
