#!/usr/bin/env node

/**
 * 🔐 BrainBox Auth Flow Diagnostic Tool
 * 
 * Проследява целия auth flow и открива къде токенът се губи
 * 
 * USAGE:
 * 1. Отвори Chrome DevTools в Extension Service Worker
 * 2. Копирай и изпълни този код в конзолата
 * 3. Или го инжектирай като временен content script
 */

console.log('🔐 AUTH FLOW DIAGNOSTIC STARTING...\n');
console.log('='.repeat(80));

// ============================================================================
// PART 1: CHROME.STORAGE.LOCAL INSPECTION
// ============================================================================

async function inspectChromeStorage() {
  console.log('\n📦 CHROME.STORAGE.LOCAL INSPECTION');
  console.log('-'.repeat(80));
  
  if (typeof chrome === 'undefined' || !chrome.storage) {
    console.error('❌ Chrome API не е достъпно! Този скрипт трябва да се изпълни в Extension контекст.');
    return null;
  }

  return new Promise((resolve) => {
    chrome.storage.local.get(null, (items) => {
      const authKeys = [
        'auth_token',
        'token', 
        'jwt',
        'jwt_token',
        'session',
        'user',
        'user_id',
        'access_token',
        'refresh_token',
        'expires_at',
        'auth_state'
      ];

      console.log('🔍 Търсене на auth-related ключове...\n');

      const foundKeys = {};
      let totalKeys = Object.keys(items).length;
      
      console.log(`📊 Общо ключове в storage: ${totalKeys}\n`);

      // Проверка на стандартни auth ключове
      authKeys.forEach(key => {
        if (items.hasOwnProperty(key)) {
          foundKeys[key] = items[key];
          console.log(`✓ ${key}:`);
          
          if (typeof items[key] === 'string' && items[key].length > 50) {
            console.log(`  Value: ${items[key].substring(0, 50)}... (truncated)`);
          } else {
            console.log(`  Value:`, items[key]);
          }
          
          // Token expiry check
          if (key.includes('expires') || key.includes('exp')) {
            try {
              const expTime = typeof items[key] === 'number' 
                ? items[key] 
                : parseInt(items[key]);
              
              const now = Date.now() / 1000;
              const diff = expTime - now;
              
              if (diff > 0) {
                console.log(`  ⏰ Expires in: ${Math.floor(diff / 60)} minutes`);
              } else {
                console.log(`  ⚠️  EXPIRED ${Math.abs(Math.floor(diff / 60))} minutes ago!`);
              }
            } catch (e) {
              // Not a timestamp
            }
          }
        }
      });

      // Проверка на всички ключове за потенциални токени
      console.log('\n🔎 Сканиране на всички ключове за JWT pattern...\n');
      
      Object.keys(items).forEach(key => {
        const value = items[key];
        
        // JWT pattern detection (header.payload.signature)
        if (typeof value === 'string' && value.match(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)) {
          console.log(`🎯 Потенциален JWT намерен в "${key}":`);
          console.log(`   ${value.substring(0, 60)}...`);
          
          try {
            // Decode JWT payload
            const parts = value.split('.');
            const payload = JSON.parse(atob(parts[1]));
            console.log('   📋 Payload:', payload);
            
            if (payload.exp) {
              const now = Date.now() / 1000;
              const diff = payload.exp - now;
              
              if (diff > 0) {
                console.log(`   ⏰ Valid for: ${Math.floor(diff / 60)} minutes`);
              } else {
                console.log(`   ❌ EXPIRED ${Math.abs(Math.floor(diff / 60))} minutes ago!`);
              }
            }
          } catch (e) {
            console.log('   ⚠️  Не може да се декодира payload');
          }
        }
      });

      if (Object.keys(foundKeys).length === 0) {
        console.log('⚠️  НЯМА auth ключове в chrome.storage.local!');
        console.log('   Потребителят вероятно не е логнат или токенът е изтрит.\n');
      }

      resolve(foundKeys);
    });
  });
}

// ============================================================================
// PART 2: SUPABASE SESSION CHECK (за Dashboard)
// ============================================================================

async function checkSupabaseSession() {
  console.log('\n🔐 SUPABASE SESSION CHECK');
  console.log('-'.repeat(80));
  
  // Проверка дали сме в Dashboard контекст
  if (typeof window === 'undefined') {
    console.log('⚠️  Не сме в browser window контекст, пропускаме Supabase check');
    return;
  }

  // Проверка на localStorage за Supabase auth tokens
  const supabaseKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.includes('supabase') || key.includes('auth')) {
      supabaseKeys.push(key);
    }
  }

  if (supabaseKeys.length > 0) {
    console.log('✓ Supabase ключове намерени в localStorage:\n');
    supabaseKeys.forEach(key => {
      const value = localStorage.getItem(key);
      console.log(`  ${key}:`);
      
      try {
        const parsed = JSON.parse(value);
        console.log('    Type:', typeof parsed);
        
        if (parsed.access_token) {
          console.log('    ✓ Access token: Present');
          console.log('    Length:', parsed.access_token.length);
        }
        
        if (parsed.refresh_token) {
          console.log('    ✓ Refresh token: Present');
        }
        
        if (parsed.expires_at) {
          const now = Date.now() / 1000;
          const diff = parsed.expires_at - now;
          
          if (diff > 0) {
            console.log(`    ⏰ Expires in: ${Math.floor(diff / 60)} minutes`);
          } else {
            console.log(`    ❌ EXPIRED ${Math.abs(Math.floor(diff / 60))} minutes ago!`);
          }
        }
      } catch (e) {
        console.log('    Value (raw):', value.substring(0, 100) + '...');
      }
    });
  } else {
    console.log('⚠️  НЯМА Supabase auth в localStorage!');
  }

  // Проверка на cookies
  console.log('\n🍪 COOKIES CHECK:');
  if (document.cookie) {
    const cookies = document.cookie.split(';');
    const authCookies = cookies.filter(c => 
      c.includes('supabase') || 
      c.includes('auth') || 
      c.includes('session') ||
      c.includes('token')
    );
    
    if (authCookies.length > 0) {
      console.log('✓ Auth cookies намерени:');
      authCookies.forEach(c => console.log(`  ${c.trim()}`));
    } else {
      console.log('⚠️  НЯМА auth cookies');
    }
  } else {
    console.log('⚠️  НЯМА cookies изобщо');
  }
}

// ============================================================================
// PART 3: AUTH FLOW EVENT LISTENER
// ============================================================================

function setupAuthFlowMonitor() {
  console.log('\n👂 НАСТРОЙКА НА AUTH FLOW MONITOR');
  console.log('-'.repeat(80));
  console.log('Мониторинг на:\n');
  console.log('  - chrome.storage.local промени');
  console.log('  - chrome.runtime.sendMessage (auth related)');
  console.log('  - localStorage промени');
  console.log('  - Window messages (postMessage)\n');

  // Monitor chrome.storage changes
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        const authRelated = Object.keys(changes).filter(key => 
          key.includes('auth') || 
          key.includes('token') || 
          key.includes('session') ||
          key.includes('user')
        );

        if (authRelated.length > 0) {
          console.log('\n🔔 CHROME.STORAGE.LOCAL CHANGE DETECTED:');
          console.log('Time:', new Date().toISOString());
          authRelated.forEach(key => {
            console.log(`  ${key}:`);
            console.log('    Old:', changes[key].oldValue);
            console.log('    New:', changes[key].newValue);
          });
        }
      }
    });
    console.log('✓ chrome.storage.onChanged listener attached');
  }

  // Monitor runtime messages
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (
        message.action && (
          message.action.includes('auth') ||
          message.action.includes('token') ||
          message.action.includes('login') ||
          message.action.includes('logout')
        )
      ) {
        console.log('\n🔔 AUTH MESSAGE DETECTED:');
        console.log('Time:', new Date().toISOString());
        console.log('Action:', message.action);
        console.log('Sender:', sender);
        console.log('Message:', message);
      }
      
      return false; // Don't block the message
    });
    console.log('✓ chrome.runtime.onMessage listener attached');
  }

  // Monitor window messages (for token bridge)
  if (typeof window !== 'undefined') {
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type && (
        event.data.type.includes('auth') ||
        event.data.type.includes('token') ||
        event.data.type === 'BRAINBOX_AUTH'
      )) {
        console.log('\n🔔 WINDOW MESSAGE (Token Bridge):');
        console.log('Time:', new Date().toISOString());
        console.log('Origin:', event.origin);
        console.log('Data:', event.data);
      }
    });
    console.log('✓ window.message listener attached');
  }

  // Monitor localStorage (if available)
  if (typeof Storage !== 'undefined' && typeof window !== 'undefined') {
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
      if (key.includes('supabase') || key.includes('auth')) {
        console.log('\n🔔 LOCALSTORAGE WRITE:');
        console.log('Time:', new Date().toISOString());
        console.log('Key:', key);
        console.log('Value (first 100 chars):', value.substring(0, 100));
      }
      return originalSetItem.apply(this, arguments);
    };

    const originalRemoveItem = localStorage.removeItem;
    localStorage.removeItem = function(key) {
      if (key.includes('supabase') || key.includes('auth')) {
        console.log('\n🔔 LOCALSTORAGE DELETE:');
        console.log('Time:', new Date().toISOString());
        console.log('Key:', key);
      }
      return originalRemoveItem.apply(this, arguments);
    };

    console.log('✓ localStorage interceptors attached');
  }

  console.log('\n✅ Auth Flow Monitor активен!\n');
}

// ============================================================================
// PART 4: COMMON AUTH ISSUES DETECTION
// ============================================================================

async function detectCommonIssues(storageData) {
  console.log('\n🩺 ДИАГНОСТИКА НА ЧЕСТИ ПРОБЛЕМИ');
  console.log('-'.repeat(80));

  const issues = [];

  // Issue 1: Token липсва
  const hasToken = storageData && Object.keys(storageData).some(k => 
    k.includes('token') || k.includes('jwt')
  );

  if (!hasToken) {
    issues.push({
      severity: 'CRITICAL',
      issue: 'Липсва auth token в chrome.storage.local',
      solution: 'Потребителят трябва да се логне през Dashboard-а на /extension-auth'
    });
  }

  // Issue 2: Expired token
  if (storageData) {
    Object.entries(storageData).forEach(([key, value]) => {
      if (typeof value === 'string' && value.match(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)) {
        try {
          const parts = value.split('.');
          const payload = JSON.parse(atob(parts[1]));
          
          if (payload.exp) {
            const now = Date.now() / 1000;
            if (payload.exp < now) {
              issues.push({
                severity: 'HIGH',
                issue: `Токенът в "${key}" е изтекъл`,
                expiredAt: new Date(payload.exp * 1000).toISOString(),
                solution: 'Нужно е refresh на токена или нов login'
              });
            }
          }
        } catch (e) {
          // Skip
        }
      }
    });
  }

  // Issue 3: Missing user_id
  if (storageData && !storageData.user_id && !storageData.user) {
    issues.push({
      severity: 'MEDIUM',
      issue: 'Липсва user_id в storage',
      solution: 'Проверете дали JWT payload-а съдържа user_id/sub'
    });
  }

  // Issue 4: Check for authManager initialization
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    // This would need actual code inspection, just flagging possibility
    issues.push({
      severity: 'INFO',
      issue: 'Проверете дали AuthManager се инициализира правилно в service-worker.ts',
      solution: 'Погледнете Console за грешки при startup на extension-а'
    });
  }

  console.log(`\n📋 Намерени проблеми: ${issues.length}\n`);

  issues.forEach((issue, i) => {
    const icon = issue.severity === 'CRITICAL' ? '🔴' 
                : issue.severity === 'HIGH' ? '🟠'
                : issue.severity === 'MEDIUM' ? '🟡'
                : 'ℹ️';

    console.log(`${icon} ${issue.severity}: ${issue.issue}`);
    console.log(`   💡 Решение: ${issue.solution}`);
    if (issue.expiredAt) {
      console.log(`   ⏰ Изтекъл на: ${issue.expiredAt}`);
    }
    console.log('');
  });

  return issues;
}

// ============================================================================
// PART 5: AUTH FLOW TRACE
// ============================================================================

function printAuthFlowDiagram() {
  console.log('\n📊 EXPECTED AUTH FLOW');
  console.log('-'.repeat(80));
  console.log(`
1️⃣  USER OPENS DASHBOARD (localhost:3000)
    ↓
    ✓ Checks for Supabase session (localStorage)
    ↓
2️⃣  IF NO SESSION → Redirect to /login
    IF SESSION EXISTS → Continue
    ↓
3️⃣  USER NAVIGATES TO /extension-auth
    ↓
    ✓ content-dashboard-auth.ts injects
    ✓ Reads Supabase session from localStorage
    ↓
4️⃣  SENDS TOKEN TO EXTENSION
    window.postMessage({
      type: 'BRAINBOX_AUTH',
      token: jwt,
      userId: user.id
    })
    ↓
5️⃣  EXTENSION BACKGROUND SERVICE WORKER
    ✓ Receives message via chrome.runtime.onMessage
    ✓ authManager.setToken(token)
    ✓ Saves to chrome.storage.local
    ↓
6️⃣  TOKEN STORED ✅
    chrome.storage.local.set({
      auth_token: jwt,
      user_id: userId,
      expires_at: exp
    })
    ↓
7️⃣  SUBSEQUENT API CALLS
    ✓ dashboardApi.ts reads token from storage
    ✓ Adds "Authorization: Bearer <token>" header
    ✓ Makes request to Dashboard API

🔍 PROBLEMATIC SCENARIOS:

❌ Token се изтрива при extension reload
   → Проверете дали има chrome.runtime.onInstalled listener
   → който случайно clear-ва storage

❌ Token не се прехвърля правилно
   → Проверете Network tab за blocked postMessage заради CSP
   → Проверете Console за CORS errors

❌ Token изтича твърде бързо
   → Проверете JWT exp field
   → Supabase default е 3600s (1 hour)

❌ authManager не инициализира token при startup
   → Проверете service-worker.ts за грешки
   → Token може да е в storage но не се чете
  `);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function runDiagnostics() {
  console.log('🚀 Starting full diagnostic suite...\n');

  // Step 1: Inspect storage
  const storageData = await inspectChromeStorage();

  // Step 2: Check Supabase (if in web context)
  await checkSupabaseSession();

  // Step 3: Detect issues
  const issues = await detectCommonIssues(storageData);

  // Step 4: Setup monitoring
  setupAuthFlowMonitor();

  // Step 5: Print flow diagram
  printAuthFlowDiagram();

  console.log('\n' + '='.repeat(80));
  console.log('✅ ДИАГНОСТИКА ЗАВЪРШЕНА');
  console.log('='.repeat(80));
  console.log('\n💡 NEXT STEPS:\n');
  console.log('1. Прегледай намерените проблеми по-горе');
  console.log('2. Мониторът е активен - отвори нов tab и направи login');
  console.log('3. Наблюдавай конзолата за auth events в реално време');
  console.log('4. Ако виждаш "LOCALSTORAGE DELETE" - това е червен флаг!');
  console.log('5. Провери дали token-а се появява в chrome.storage.local след login\n');
}

// Run diagnostics
runDiagnostics().catch(console.error);
