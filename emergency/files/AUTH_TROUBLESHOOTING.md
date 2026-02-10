# 🔐 BrainBox Auth Flow - Troubleshooting Guide

**Version**: 3.1.0  
**Last Updated**: 2026-02-10

---

## 🎯 СИМПТОМ: "Всеки път ме праща на Login Page"

### Възможни причини (от най-вероятна към най-малко вероятна):

---

## 🔴 ПРИЧИНА 1: Token се изтрива при Extension reload/update

### Индикатори:
- Работи след login, но след chrome restart → пак login
- След extension update → пак login
- След disable/enable extension → пак login

### Локация на проблема:
**File**: `apps/extension/src/background/modules/installationManager.ts`

### Проверка:
```javascript
// В Chrome DevTools → Extensions → BrainBox → Service Worker console:

chrome.runtime.onInstalled.addListener((details) => {
  console.log('onInstalled fired:', details.reason);
  // ❌ ГРЕШНО -ако виждаш chrome.storage.local.clear() тук
  // ✅ ПРАВИЛНО - само при reason === 'install', не при 'update'
});
```

### Решение:
```typescript
// installationManager.ts - ПРАВИЛНА имплементация

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Само при ПЪРВА инсталация
    await chrome.storage.local.set({
      installation_date: Date.now(),
      version: chrome.runtime.getManifest().version
    });
    
    // НЕ clear-вай storage!
  }
  
  if (details.reason === 'update') {
    // При update ЗАПАЗИ auth token!
    console.log('Extension updated, preserving auth state');
  }
});
```

---

## 🟠 ПРИЧИНА 2: Token Bridge не прехвърля токена правилно

### Индикатори:
- Login page се зарежда
- Вижда се "Authentication successful" съобщение
- НО extension все още не е логнат

### Локация на проблема:
**Files**: 
- `apps/extension/src/content/content-dashboard-auth.ts`
- `apps/dashboard/src/app/extension-auth/page.tsx`

### Проверка:
```javascript
// В Dashboard console (localhost:3000/extension-auth):

window.addEventListener('message', (event) => {
  console.log('Message sent to extension:', event.data);
});

// Трябва да видиш:
// { type: 'BRAINBOX_AUTH', token: 'eyJ...', userId: '...' }
```

### Дебъг стъпки:

#### Стъпка 1: Провери Supabase session в Dashboard
```javascript
// В localhost:3000/extension-auth console:

const session = localStorage.getItem('supabase.auth.token');
console.log('Supabase session:', session ? 'EXISTS' : 'MISSING');

if (session) {
  const parsed = JSON.parse(session);
  console.log('Access token:', parsed.currentSession?.access_token?.substring(0, 50));
}
```

#### Стъпка 2: Провери postMessage изпращането
```javascript
// Добави в content-dashboard-auth.ts временно:

console.log('[BRAINBOX] Sending auth message...');
window.postMessage({
  type: 'BRAINBOX_AUTH',
  token: accessToken,
  userId: user.id
}, '*');
console.log('[BRAINBOX] Message sent!');
```

#### Стъпка 3: Провери получаването в Extension
```javascript
// В service-worker.ts добави:

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[SW] Received message:', message);
  
  if (message.type === 'BRAINBOX_AUTH') {
    console.log('[SW] Auth message received!', {
      hasToken: !!message.token,
      hasUserId: !!message.userId
    });
  }
});
```

### Решение:
Ако съобщението НЕ се получава, проблемът е в content script injection:

```typescript
// manifest.json - ПРОВЕРИ content_scripts секцията

{
  "content_scripts": [
    {
      "matches": ["http://localhost:3000/*", "https://yourdomain.com/*"],
      "js": ["src/content/content-dashboard-auth.ts"],
      "run_at": "document_idle"  // ← ВАЖНО!
    }
  ]
}
```

---

## 🟡 ПРИЧИНА 3: Token изтича твърде бързо

### Индикатори:
- Работи 1 час след login
- След това → автоматично logout

### Локация на проблема:
**File**: `apps/extension/src/background/modules/authManager.ts`

### Проверка:
```javascript
// Виж JWT payload:

chrome.storage.local.get('auth_token', (items) => {
  const token = items.auth_token;
  if (token) {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = new Date(payload.exp * 1000);
    const now = new Date();
    
    console.log('Token expires:', exp);
    console.log('Time left:', Math.floor((exp - now) / 60000), 'minutes');
  }
});
```

### Решение:

#### Вариант A: Автоматичен refresh (препоръчително)
```typescript
// authManager.ts

class AuthManager {
  private refreshTimer: number | null = null;
  
  async setToken(token: string) {
    await chrome.storage.local.set({ auth_token: token });
    
    // Декодирай експирацията
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresIn = (payload.exp * 1000) - Date.now();
    
    // Refresh 5 минути преди да изтече
    const refreshIn = expiresIn - (5 * 60 * 1000);
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    
    this.refreshTimer = setTimeout(() => {
      this.refreshToken();
    }, refreshIn);
  }
  
  async refreshToken() {
    try {
      const response = await fetch(`${DASHBOARD_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await this.getToken()}`
        }
      });
      
      const { token } = await response.json();
      await this.setToken(token);
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Изчисти storage и принуди re-login
      await this.clearToken();
    }
  }
}
```

#### Вариант B: Increase token TTL в Supabase
```sql
-- В Supabase SQL Editor:

ALTER DATABASE postgres SET jwt_expiry_limit = 604800; -- 7 дни вместо 1 час
```

---

## 🟢 ПРИЧИНА 4: authManager не инициализира token при startup

### Индикатори:
- Token е в chrome.storage.local
- НО API calls failват с 401

### Локация на проблема:
**File**: `apps/extension/src/background/service-worker.ts`

### Проверка:
```javascript
// В Extension Service Worker console:

chrome.storage.local.get('auth_token', (items) => {
  console.log('Token in storage:', items.auth_token ? 'YES' : 'NO');
});

// Сега направи API call:
fetch('http://localhost:3000/api/chats', {
  headers: {
    'Authorization': 'Bearer ' + items.auth_token  // ← Дали се добавя?
  }
});
```

### Решение:
```typescript
// service-worker.ts

import { AuthManager } from './modules/authManager';

const authManager = new AuthManager();

// ВАЖНО: Initialize при startup
self.addEventListener('install', async () => {
  console.log('[SW] Installing...');
  await authManager.initialize(); // ← Зареди token от storage
});

self.addEventListener('activate', async () => {
  console.log('[SW] Activating...');
  await authManager.initialize(); // ← И тук също!
});

// authManager.ts
class AuthManager {
  private token: string | null = null;
  
  async initialize() {
    const items = await chrome.storage.local.get('auth_token');
    this.token = items.auth_token || null;
    
    if (this.token) {
      console.log('[AuthManager] Token loaded from storage');
    } else {
      console.log('[AuthManager] No token found');
    }
  }
  
  async getToken(): Promise<string | null> {
    // Ако още не сме инициализирани, направи го сега
    if (this.token === null) {
      await this.initialize();
    }
    return this.token;
  }
}
```

---

## 🔵 ПРИЧИНА 5: CORS / CSP блокиране

### Индикатори:
- Console errors за CORS
- "Refused to connect" messages
- Network tab показва blocked requests

### Проверка:
```javascript
// В Dashboard console:

fetch('http://localhost:3000/api/chats', {
  credentials: 'include',  // ← Важно за cookies
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

### Решение:

#### Dashboard next.config.js
```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'chrome-extension://*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      },
    ];
  },
};
```

#### Extension manifest.json
```json
{
  "host_permissions": [
    "http://localhost:3000/*",
    "https://yourdomain.com/*"
  ]
}
```

---

## 🛠️ COMPREHENSIVE DEBUG SCRIPT

Използвай този скрипт за автоматична диагностика:

```javascript
// Изпълни в Extension Service Worker console:

async function fullAuthDiagnostic() {
  console.log('🔍 STARTING FULL AUTH DIAGNOSTIC...\n');
  
  // 1. Check storage
  const storage = await chrome.storage.local.get(null);
  const authKeys = Object.keys(storage).filter(k => 
    k.includes('auth') || k.includes('token') || k.includes('user')
  );
  
  console.log('1️⃣ Storage check:');
  console.log('  Auth keys found:', authKeys.length);
  authKeys.forEach(k => console.log(`    - ${k}`));
  
  // 2. Decode token
  if (storage.auth_token) {
    try {
      const payload = JSON.parse(atob(storage.auth_token.split('.')[1]));
      const exp = new Date(payload.exp * 1000);
      const now = new Date();
      
      console.log('\n2️⃣ Token analysis:');
      console.log('  User ID:', payload.sub || payload.user_id);
      console.log('  Expires:', exp.toISOString());
      console.log('  Valid:', exp > now ? '✅ YES' : '❌ NO (EXPIRED)');
      console.log('  Time left:', Math.floor((exp - now) / 60000), 'minutes');
    } catch (e) {
      console.log('\n2️⃣ Token analysis: ❌ FAILED TO DECODE');
    }
  } else {
    console.log('\n2️⃣ Token analysis: ❌ NO TOKEN IN STORAGE');
  }
  
  // 3. Test API call
  console.log('\n3️⃣ Testing API connectivity...');
  try {
    const response = await fetch('http://localhost:3000/api/health', {
      headers: storage.auth_token ? {
        'Authorization': `Bearer ${storage.auth_token}`
      } : {}
    });
    
    console.log('  Status:', response.status);
    console.log('  Auth header sent:', !!storage.auth_token);
    
    if (response.status === 401) {
      console.log('  ❌ UNAUTHORIZED - Token invalid or expired');
    } else if (response.ok) {
      console.log('  ✅ API accessible');
    }
  } catch (e) {
    console.log('  ❌ NETWORK ERROR:', e.message);
  }
  
  console.log('\n✅ Diagnostic complete!');
}

fullAuthDiagnostic();
```

---

## 📊 EXPECTED vs ACTUAL FLOW

### ✅ EXPECTED (Correct Flow):
```
1. User visits /extension-auth
2. content-dashboard-auth.ts reads Supabase session
3. postMessage sends token to extension
4. service-worker receives message
5. authManager.setToken() stores in chrome.storage.local
6. Token persists across sessions
7. API calls include Authorization header
```

### ❌ ACTUAL (Broken Flow) - Possibilities:

**Scenario A: Token never reaches extension**
```
1. User visits /extension-auth
2. content-dashboard-auth.ts reads Supabase session
3. postMessage sends token
❌ service-worker NEVER receives message
→ Check manifest.json content_scripts
→ Check CSP headers
```

**Scenario B: Token gets deleted**
```
1-6. ✅ (working)
7. Extension reloads/updates
❌ installationManager clears storage
→ Fix: Don't clear storage on update
```

**Scenario C: Token expires too fast**
```
1-6. ✅ (working)
7. 1 hour passes
❌ Token expired, no refresh logic
→ Fix: Implement auto-refresh
```

---

## 🎯 ACTION PLAN

### Day 1: Identify
1. Run `extension_auth_tracer.js` in Service Worker
2. Login via /extension-auth
3. Watch for TOKEN_SET event
4. Check if token persists after browser restart

### Day 2: Fix
1. If token not set → Fix Token Bridge
2. If token deleted → Fix installationManager
3. If token expires → Add refresh logic

### Day 3: Verify
1. Login once
2. Close Chrome
3. Open Chrome
4. Extension should still be logged in ✅

---

## 📞 EMERGENCY FIXES

### Quick Fix 1: Увеличи token TTL
```typescript
// В Supabase Dashboard → Authentication → Settings:
JWT expiry limit: 604800 (7 дни)
```

### Quick Fix 2: Disable storage clear
```typescript
// installationManager.ts
chrome.runtime.onInstalled.addListener(async (details) => {
  // ВРЕМЕННО: Коментирай ВСИЧКО
  // await chrome.storage.local.clear(); // ← Махни това!
});
```

### Quick Fix 3: Force token persistence
```typescript
// service-worker.ts - add this hack temporarily:
setInterval(async () => {
  const items = await chrome.storage.local.get('auth_token');
  if (!items.auth_token) {
    console.warn('[HACK] Token missing, prompting re-login');
    // Show notification to user
  }
}, 60000); // Check every minute
```

---

**Last Resort**: Ако нищо не работи, провери дали `authManager` instance-а не се пресъздава при всеки message:

```typescript
// ❌ ГРЕШНО (в service-worker.ts):
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const authManager = new AuthManager(); // ← НОВ instance всеки път!
});

// ✅ ПРАВИЛНО:
const authManager = new AuthManager(); // ← ЕДИН ГЛОБАЛЕН instance

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  authManager.handleMessage(msg); // ← Използвай същия
});
```
