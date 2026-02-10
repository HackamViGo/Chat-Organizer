/**
 * 🎯 Extension Auth Flow Tracer
 * 
 * ИНСТРУКЦИИ ЗА ИЗПОЛЗВАНЕ:
 * 
 * 1. Отвори Chrome → chrome://extensions
 * 2. Намери BrainBox Extension → кликни "Service Worker"
 * 3. В отворената DevTools конзола, копирай и изпълни ЦЕЛИЯ този файл
 * 4. Направи login в Dashboard на /extension-auth
 * 5. Наблюдавай логовете в реално време
 * 
 * ЦЕЛИ:
 * - Лови КЪДЕ токенът се пише
 * - Лови КЪДЕ токенът се изтрива
 * - Лови КОГА authManager.setToken() се извиква
 * - Лови ВСИЧКИ auth-related messages
 */

console.clear();
console.log('%c🎯 EXTENSION AUTH FLOW TRACER ACTIVATED', 'color: #00ff00; font-size: 16px; font-weight: bold');
console.log('='.repeat(80));
console.log('Time:', new Date().toISOString());
console.log('\n');

// ============================================================================
// AUTH STATE TRACKER
// ============================================================================

const authStateTracker = {
  events: [],
  currentToken: null,
  tokenSetCount: 0,
  tokenDeleteCount: 0,
  
  log(type, message, data = null) {
    const timestamp = new Date().toISOString();
    const event = { timestamp, type, message, data };
    this.events.push(event);
    
    const colors = {
      'TOKEN_SET': 'color: #00ff00; font-weight: bold',
      'TOKEN_DELETE': 'color: #ff0000; font-weight: bold',
      'TOKEN_READ': 'color: #00aaff',
      'MESSAGE': 'color: #ffaa00',
      'ERROR': 'color: #ff0000; font-weight: bold',
      'INFO': 'color: #aaaaaa'
    };
    
    console.log(
      `%c[${timestamp}] ${type}: ${message}`,
      colors[type] || 'color: white'
    );
    
    if (data) {
      console.log('  Data:', data);
    }
  },
  
  getSummary() {
    return {
      totalEvents: this.events.length,
      tokenSets: this.tokenSetCount,
      tokenDeletes: this.tokenDeleteCount,
      currentToken: this.currentToken ? 'Present' : 'Missing',
      timeline: this.events
    };
  }
};

// ============================================================================
// INTERCEPT chrome.storage.local
// ============================================================================

console.log('📦 Installing chrome.storage.local interceptors...');

const originalGet = chrome.storage.local.get;
const originalSet = chrome.storage.local.set;
const originalRemove = chrome.storage.local.remove;
const originalClear = chrome.storage.local.clear;

// GET interceptor
chrome.storage.local.get = function(...args) {
  const keys = args[0];
  const callback = args[args.length - 1];
  
  authStateTracker.log('TOKEN_READ', 'chrome.storage.local.get() called', { keys });
  
  return originalGet.call(this, keys, (items) => {
    const authKeys = Object.keys(items || {}).filter(k => 
      k.includes('auth') || 
      k.includes('token') || 
      k.includes('user') ||
      k.includes('jwt')
    );
    
    if (authKeys.length > 0) {
      authStateTracker.log('TOKEN_READ', 'Auth data retrieved', { 
        keys: authKeys,
        preview: Object.fromEntries(
          authKeys.map(k => [k, typeof items[k] === 'string' ? items[k].substring(0, 30) + '...' : items[k]])
        )
      });
    }
    
    if (callback) callback(items);
  });
};

// SET interceptor
chrome.storage.local.set = function(items, callback) {
  const authKeys = Object.keys(items).filter(k => 
    k.includes('auth') || 
    k.includes('token') || 
    k.includes('user') ||
    k.includes('jwt')
  );
  
  if (authKeys.length > 0) {
    authStateTracker.tokenSetCount++;
    authStateTracker.log('TOKEN_SET', `🔐 AUTH DATA WRITTEN (Count: ${authStateTracker.tokenSetCount})`, {
      keys: authKeys,
      values: Object.fromEntries(
        authKeys.map(k => [
          k, 
          typeof items[k] === 'string' ? items[k].substring(0, 50) + '...' : items[k]
        ])
      )
    });
    
    // Try to decode JWT if present
    authKeys.forEach(key => {
      const value = items[key];
      if (typeof value === 'string' && value.match(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)) {
        try {
          const payload = JSON.parse(atob(value.split('.')[1]));
          authStateTracker.currentToken = payload;
          
          console.log('%c  📋 JWT PAYLOAD:', 'color: #00ff00');
          console.log('    user_id:', payload.sub || payload.user_id);
          console.log('    exp:', new Date(payload.exp * 1000).toISOString());
          console.log('    iat:', new Date(payload.iat * 1000).toISOString());
          
          const now = Date.now() / 1000;
          const timeLeft = payload.exp - now;
          console.log(`    ⏰ Valid for: ${Math.floor(timeLeft / 60)} minutes`);
        } catch (e) {
          console.log('    ⚠️  Could not decode JWT');
        }
      }
    });
    
    // Capture stack trace to see WHO is setting the token
    console.log('%c  📍 STACK TRACE:', 'color: #ffaa00');
    console.trace();
  }
  
  return originalSet.call(this, items, callback);
};

// REMOVE interceptor
chrome.storage.local.remove = function(keys, callback) {
  const keyArray = Array.isArray(keys) ? keys : [keys];
  const authKeys = keyArray.filter(k => 
    k.includes('auth') || 
    k.includes('token') || 
    k.includes('user') ||
    k.includes('jwt')
  );
  
  if (authKeys.length > 0) {
    authStateTracker.tokenDeleteCount++;
    authStateTracker.log('TOKEN_DELETE', `🗑️  AUTH DATA REMOVED (Count: ${authStateTracker.tokenDeleteCount})`, {
      keys: authKeys
    });
    
    authStateTracker.currentToken = null;
    
    // THIS IS A CRITICAL EVENT - capture full stack
    console.log('%c  🚨 CRITICAL: Token deletion detected!', 'color: #ff0000; font-size: 14px; font-weight: bold');
    console.log('%c  📍 DELETION STACK TRACE:', 'color: #ff0000; font-weight: bold');
    console.trace();
  }
  
  return originalRemove.call(this, keys, callback);
};

// CLEAR interceptor (nuclear option)
chrome.storage.local.clear = function(callback) {
  authStateTracker.log('TOKEN_DELETE', '💣 chrome.storage.local.clear() called - ALL DATA DELETED!');
  authStateTracker.currentToken = null;
  authStateTracker.tokenDeleteCount++;
  
  console.log('%c  🚨🚨🚨 CRITICAL: Storage cleared completely!', 'color: #ff0000; font-size: 16px; font-weight: bold');
  console.log('%c  📍 CLEAR STACK TRACE:', 'color: #ff0000; font-weight: bold');
  console.trace();
  
  return originalClear.call(this, callback);
};

console.log('✓ chrome.storage.local interceptors installed\n');

// ============================================================================
// INTERCEPT chrome.runtime.onMessage
// ============================================================================

console.log('📨 Installing message interceptors...');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Log all auth-related messages
  if (message.action) {
    const authActions = ['checkAuth', 'login', 'logout', 'getToken', 'setToken', 'refreshToken'];
    
    if (authActions.some(action => message.action.toLowerCase().includes(action.toLowerCase()))) {
      authStateTracker.log('MESSAGE', `Auth message received: ${message.action}`, {
        sender: sender.tab ? `Tab ${sender.tab.id}` : 'Extension',
        message: message
      });
    }
  }
  
  // Don't block the message
  return false;
});

console.log('✓ Message interceptors installed\n');

// ============================================================================
// MONITOR chrome.storage.onChanged
// ============================================================================

console.log('👂 Installing storage change listener...');

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    const authChanges = Object.keys(changes).filter(k =>
      k.includes('auth') ||
      k.includes('token') ||
      k.includes('user') ||
      k.includes('jwt')
    );
    
    if (authChanges.length > 0) {
      authStateTracker.log('INFO', 'Storage changed event detected', {
        changes: Object.fromEntries(
          authChanges.map(k => [
            k,
            {
              old: changes[k].oldValue,
              new: changes[k].newValue
            }
          ])
        )
      });
    }
  }
});

console.log('✓ Storage change listener installed\n');

// ============================================================================
// INITIAL STATE CHECK
// ============================================================================

console.log('🔍 Checking current auth state...\n');

chrome.storage.local.get(null, (items) => {
  const authKeys = Object.keys(items).filter(k =>
    k.includes('auth') ||
    k.includes('token') ||
    k.includes('user') ||
    k.includes('jwt')
  );
  
  if (authKeys.length > 0) {
    console.log('%c✓ Auth data found in storage:', 'color: #00ff00; font-weight: bold');
    authKeys.forEach(key => {
      const value = items[key];
      console.log(`  ${key}:`, typeof value === 'string' ? value.substring(0, 50) + '...' : value);
    });
  } else {
    console.log('%c⚠️  No auth data in storage', 'color: #ffaa00; font-weight: bold');
    console.log('  User needs to login via Dashboard /extension-auth');
  }
  
  console.log('\n');
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Add global helper to get summary
window.getAuthSummary = () => {
  const summary = authStateTracker.getSummary();
  console.log('\n' + '='.repeat(80));
  console.log('📊 AUTH FLOW SUMMARY');
  console.log('='.repeat(80));
  console.log('Total events:', summary.totalEvents);
  console.log('Token sets:', summary.tokenSets);
  console.log('Token deletes:', summary.tokenDeletes);
  console.log('Current token:', summary.currentToken);
  console.log('\n📋 Event Timeline:');
  summary.timeline.forEach((event, i) => {
    console.log(`${i + 1}. [${event.timestamp}] ${event.type}: ${event.message}`);
    if (event.data) {
      console.log('   Data:', event.data);
    }
  });
  console.log('='.repeat(80) + '\n');
  
  return summary;
};

// Add helper to check current token
window.checkCurrentToken = async () => {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (items) => {
      const authKeys = Object.keys(items).filter(k =>
        k.includes('auth') ||
        k.includes('token') ||
        k.includes('user') ||
        k.includes('jwt')
      );
      
      console.log('\n🔍 CURRENT TOKEN STATUS:');
      
      if (authKeys.length === 0) {
        console.log('%c❌ NO TOKEN FOUND', 'color: #ff0000; font-weight: bold');
        resolve(null);
        return;
      }
      
      authKeys.forEach(key => {
        const value = items[key];
        console.log(`\n${key}:`);
        console.log('  Type:', typeof value);
        console.log('  Value:', typeof value === 'string' ? value.substring(0, 100) + '...' : value);
        
        // Try to decode JWT
        if (typeof value === 'string' && value.match(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)) {
          try {
            const payload = JSON.parse(atob(value.split('.')[1]));
            console.log('  Payload:', payload);
            
            const now = Date.now() / 1000;
            const timeLeft = payload.exp - now;
            
            if (timeLeft > 0) {
              console.log(`  ✅ VALID - ${Math.floor(timeLeft / 60)} minutes left`);
            } else {
              console.log(`  ❌ EXPIRED - ${Math.abs(Math.floor(timeLeft / 60))} minutes ago`);
            }
          } catch (e) {
            console.log('  ⚠️  Could not decode');
          }
        }
      });
      
      resolve(items);
    });
  });
};

// ============================================================================
// FINAL SETUP
// ============================================================================

console.log('='.repeat(80));
console.log('%c✅ AUTH FLOW TRACER READY!', 'color: #00ff00; font-size: 16px; font-weight: bold');
console.log('='.repeat(80));
console.log('\n📝 AVAILABLE COMMANDS:\n');
console.log('  getAuthSummary()     - Show complete auth event timeline');
console.log('  checkCurrentToken()  - Check current token status\n');
console.log('🎯 NOW: Open Dashboard and navigate to /extension-auth');
console.log('👀 WATCH: This console for auth events in real-time\n');
console.log('🔍 LOOK FOR:');
console.log('  ✓ TOKEN_SET events (should happen ONCE during login)');
console.log('  ❌ TOKEN_DELETE events (should NEVER happen unexpectedly)');
console.log('  ⚠️  Multiple TOKEN_SET events (may indicate refresh loop)\n');

// Auto-check every 30 seconds
let autoCheckInterval = setInterval(() => {
  console.log('\n⏰ Auto-check (every 30s)...');
  checkCurrentToken();
}, 30000);

console.log('⏰ Auto-check enabled (every 30 seconds)');
console.log('   To disable: clearInterval(' + autoCheckInterval + ')\n');
