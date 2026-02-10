# 🔐 BrainBox Auth Diagnostic Toolkit

**Version**: 3.1.0  
**Purpose**: Диагностика и отстраняване на auth проблеми в Extension  
**Created**: 2026-02-10

---

## 📦 Какво Съдържа Този Toolkit?

| File | Purpose | Usage Context |
|------|---------|---------------|
| **AUTH_TROUBLESHOOTING.md** | Comprehensive guide за най-чести auth проблеми | Read first! |
| **auth_flow_diagnostic.js** | General auth inspector | Browser console (Dashboard/Extension) |
| **extension_auth_tracer.js** | Real-time auth event tracer | Extension Service Worker console |
| **auth_code_analyzer.js** | Static code analysis | Command line |

---

## 🚀 Quick Start Guide

### Step 1: Read the Manual
```bash
# Прочети това първо!
open AUTH_TROUBLESHOOTING.md
```

Този документ съдържа:
- 5-те най-чести причини за "винаги праща на login"
- Как да диагностицираш всяка една
- Конкретни code fixes
- Emergency quick fixes

---

### Step 2: Run Static Analysis

Това ще провери кода ти за известни anti-patterns:

```bash
# От корена на monorepo-то:
node auth_code_analyzer.js ./apps/extension/src
```

**Какво търси**:
- ❌ `chrome.storage.local.clear()` в `onInstalled`
- ❌ Липсваща token refresh логика
- ❌ Множество `AuthManager` instances
- ❌ Hardcoded tokens/secrets
- ❌ Липсващи Authorization headers

**Output**:
```
🔴 CRITICAL ISSUES:
1. chrome.storage.local.clear() in onInstalled listener
   File: background/modules/installationManager.ts:15
   💡 This deletes ALL storage including auth tokens...
```

---

### Step 3: Runtime Diagnostics

#### Option A: General Diagnostic (Can run anywhere)

1. **Отвори Chrome DevTools** в Dashboard tab (localhost:3000)
2. **Console tab** → Copy/paste contents of `auth_flow_diagnostic.js`
3. **Press Enter**

**Какво проверява**:
- Supabase session в localStorage
- Cookies
- chrome.storage.local (ако е в Extension context)
- Auto-setup на event listeners

**Available Commands**:
```javascript
getAuthSummary()      // Show complete event log
checkCurrentToken()   // Check token status now
```

---

#### Option B: Extension-Specific Tracer (Recommended!)

**ЗА КАКВО Е**: Real-time мониторинг на ВСИЧКИ auth events в Extension-а

**Setup**:

1. **Отвори Extension Service Worker**:
   ```
   Chrome → chrome://extensions
   → BrainBox Extension
   → Click "Service Worker" link
   ```

2. **DevTools Console** ще се отвори
   
3. **Copy/Paste** ЦЕЛИЯ файл `extension_auth_tracer.js`

4. **Press Enter**

**Ще видиш**:
```
🎯 EXTENSION AUTH FLOW TRACER ACTIVATED
================================================================================
📦 Installing chrome.storage.local interceptors...
✓ chrome.storage.local interceptors installed
📨 Installing message interceptors...
✓ Message interceptors installed
...
✅ AUTH FLOW TRACER READY!
```

5. **Сега направи login** на `/extension-auth`

6. **Watch the console** за real-time events:

```
[2026-02-10T10:30:15.123Z] TOKEN_SET: 🔐 AUTH DATA WRITTEN (Count: 1)
  Data: { keys: ['auth_token', 'user_id'] }
  
  📋 JWT PAYLOAD:
    user_id: abc123...
    exp: 2026-02-10T11:30:15.000Z
    ⏰ Valid for: 60 minutes
    
  📍 STACK TRACE:
    at AuthManager.setToken (authManager.ts:45)
    at service-worker.ts:120
```

**RED FLAGS To Watch For**:

🚨 **TOKEN_DELETE** event = ПРОБЛЕМ!
```
[2026-02-10T10:31:00.000Z] TOKEN_DELETE: 🗑️ AUTH DATA REMOVED
  🚨 CRITICAL: Token deletion detected!
  📍 DELETION STACK TRACE:
    at installationManager.ts:12  ← ТУК Е ПРОБЛЕМЪТ!
```

🚨 **Multiple TOKEN_SET** in short time = Infinite loop
```
TOKEN_SET (Count: 1)
TOKEN_SET (Count: 2)  ← 5 seconds later
TOKEN_SET (Count: 3)  ← 5 seconds later
```

---

### Step 4: Live Debugging

След като имаш tracer-а активен, използвай helper functions:

```javascript
// Check current state
await checkCurrentToken()

// Get complete timeline
getAuthSummary()
```

**Example Output**:
```javascript
📊 AUTH FLOW SUMMARY
================================================================================
Total events: 15
Token sets: 1
Token deletes: 0  ← ТОВА ТРЯБВА ДА Е 0!
Current token: Present

📋 Event Timeline:
1. [2026-02-10T10:30:15.123Z] TOKEN_READ: chrome.storage.local.get() called
2. [2026-02-10T10:30:16.456Z] TOKEN_SET: AUTH DATA WRITTEN
3. [2026-02-10T10:31:00.000Z] MESSAGE: Auth message received: checkAuth
...
```

---

## 🎯 Common Scenarios & Solutions

### Scenario 1: Token Never Gets Set

**Symptoms**:
- Tracer shows NO `TOKEN_SET` events after login
- `checkCurrentToken()` returns nothing

**Debug**:
```javascript
// In Dashboard console (localhost:3000/extension-auth):
window.addEventListener('message', e => console.log('Sent:', e.data));

// Should see:
// { type: 'BRAINBOX_AUTH', token: 'eyJ...', userId: '...' }
```

**If message not sent** → Problem in `content-dashboard-auth.ts`
**If message sent but not received** → Problem in `manifest.json` or CSP

---

### Scenario 2: Token Gets Deleted After Browser Restart

**Symptoms**:
- Works after login
- Close Chrome → reopen → must login again
- Tracer shows `TOKEN_DELETE` on startup

**Solution**:
Check `installationManager.ts`:
```typescript
// ❌ BAD
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.clear(); // Deletes EVERYTHING!
});

// ✅ GOOD
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Only on FIRST install, not update
    chrome.storage.local.set({ installed_at: Date.now() });
  }
  // DON'T clear storage!
});
```

---

### Scenario 3: Token Expires After 1 Hour

**Symptoms**:
- Works for ~60 minutes
- Then automatically logged out
- `checkCurrentToken()` shows "EXPIRED"

**Solution**:
Add token refresh in `authManager.ts`:
```typescript
async setToken(token: string) {
  await chrome.storage.local.set({ auth_token: token });
  
  // Schedule refresh
  const payload = JSON.parse(atob(token.split('.')[1]));
  const expiresIn = (payload.exp * 1000) - Date.now();
  const refreshIn = expiresIn - (5 * 60 * 1000); // 5 min before expiry
  
  setTimeout(() => this.refreshToken(), refreshIn);
}
```

---

## 📊 Expected Auth Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER OPENS /extension-auth                               │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. content-dashboard-auth.ts READS SUPABASE SESSION         │
│    - localStorage.getItem('supabase.auth.token')            │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. SEND VIA POSTMESSAGE                                      │
│    window.postMessage({                                      │
│      type: 'BRAINBOX_AUTH',                                  │
│      token: jwt,                                             │
│      userId: user.id                                         │
│    })                                                        │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. SERVICE-WORKER RECEIVES via chrome.runtime.onMessage     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. authManager.setToken(token)                              │
│    - Saves to chrome.storage.local                          │
│    - Sets up refresh timer                                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. TOKEN PERSISTS ACROSS SESSIONS ✅                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Emergency Quick Fixes

### Fix 1: Disable Storage Clear (Temporary)
```typescript
// installationManager.ts
chrome.runtime.onInstalled.addListener(async () => {
  // TODO: Re-enable with proper logic
  // await chrome.storage.local.clear();
  console.log('Storage clear DISABLED for debugging');
});
```

### Fix 2: Increase Token Lifetime
```
Supabase Dashboard
→ Authentication
→ Settings
→ JWT expiry limit: 604800 (7 days)
```

### Fix 3: Force Token Check on Startup
```typescript
// service-worker.ts
self.addEventListener('activate', async () => {
  const items = await chrome.storage.local.get('auth_token');
  if (!items.auth_token) {
    console.warn('No token on startup - user needs to login');
  } else {
    console.log('Token found on startup ✓');
  }
});
```

---

## 📞 Support Checklist

Before asking for help, gather this info:

**Run in Extension Service Worker console**:
```javascript
await checkCurrentToken()
getAuthSummary()
```

**Copy the output and check**:
- [ ] Is there a token in storage?
- [ ] Is the token expired?
- [ ] How many TOKEN_SET events?
- [ ] How many TOKEN_DELETE events?
- [ ] What's the stack trace for deletions?

**Run static analyzer**:
```bash
node auth_code_analyzer.js ./apps/extension/src > analysis.txt
```

Share `analysis.txt` with the output.

---

## 🎓 Understanding the Output

### Good Tracer Output Example:
```
TOKEN_SET (Count: 1)           ← Set ONCE during login
  📋 JWT PAYLOAD:
    user_id: abc123
    exp: 2026-02-10T11:30:00Z
    ⏰ Valid for: 60 minutes    ← Check this isn't too short

[30 minutes pass with NO events]  ← This is GOOD! No deletions!

TOKEN_READ (Count: 1)          ← Reading for API call
  Auth data retrieved
```

### Bad Tracer Output Example:
```
TOKEN_SET (Count: 1)
TOKEN_DELETE (Count: 1)        ← 🚨 DELETED RIGHT AWAY!
  📍 STACK TRACE:
    at installationManager.ts:12  ← FIX THIS FILE!

[5 seconds later]
TOKEN_SET (Count: 2)           ← Sets again
TOKEN_DELETE (Count: 2)        ← Deletes again
[INFINITE LOOP!]
```

---

## 📚 Additional Resources

- **SYNC_PROTOCOL.md** - Detailed auth flow documentation
- **CONTEXT_MAP.md** - Architecture boundaries
- **ExtensionGraph.json** - File dependency graph

---

**Last Updated**: 2026-02-10  
**Maintainer**: Meta-Architect v3.1

---

## ✅ Success Criteria

After fixing, you should see:

1. **Login once** → Token stored
2. **Close Chrome** → Reopen
3. **Extension still logged in** ✅
4. **No TOKEN_DELETE events** ✅
5. **Token auto-refreshes** before expiry ✅

If all 5 are true, the auth flow is working correctly! 🎉
