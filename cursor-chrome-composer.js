#!/usr/bin/env node
/**
 * Chrome Remote Debugging Monitor
 * 
 * Connects to Chrome's Remote Debugging Protocol (CDP) and monitors:
 * - Console logs (log, error, warn, info, debug)
 * - Network activity (requests, responses, errors)
 * 
 * Usage:
 *   1. Start Chrome with: chrome --remote-debugging-port=9222
 *   2. Run this script: node cursor-chrome-composer.js
 *   3. The agent can now see live console and network activity
 */

const WebSocket = require('ws');

// Configuration
const DEBUG_PORT = process.env.CHROME_DEBUG_PORT || 9222;
const WS_URL = `ws://localhost:${DEBUG_PORT}`;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// State
let tabs = [];
let activeTab = null;
let ws = null;
let sessionId = null;
let pendingCommands = new Map(); // Track pending commands by ID

// Utility functions
function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ERROR: ${message}`, 'red');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function warn(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Get list of available tabs from Chrome
async function getTabs() {
  try {
    const response = await fetch(`http://localhost:${DEBUG_PORT}/json`);
    const tabs = await response.json();
    return tabs.filter(tab => tab.type === 'page');
  } catch (err) {
    error(`Failed to get tabs: ${err.message}`);
    return [];
  }
}

// Connect to Chrome DevTools Protocol
async function connectToTab(tab) {
  return new Promise((resolve, reject) => {
    const wsUrl = tab.webSocketDebuggerUrl;
    
    const timeout = setTimeout(() => {
      if (ws && ws.readyState !== WebSocket.OPEN) {
        ws.close();
        reject(new Error('Connection timeout'));
      }
    }, 5000);
    
    ws = new WebSocket(wsUrl);
    
    ws.on('open', () => {
      clearTimeout(timeout);
      success(`Connected to tab: ${tab.title || tab.url}`);
      resolve();
    });
    
    ws.on('error', (err) => {
      clearTimeout(timeout);
      error(`WebSocket error: ${err.message}`);
      reject(err);
    });
    
    ws.on('close', () => {
      warn('WebSocket connection closed');
    });
    
    // Single message handler for all messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Check if this is a response to our command (has id)
        if (message.id && pendingCommands.has(message.id)) {
          const { resolve, reject } = pendingCommands.get(message.id);
          pendingCommands.delete(message.id);
          
          if (message.error) {
            reject(new Error(message.error.message || 'CDP error'));
          } else {
            resolve(message.result || {});
          }
          return;
        }
        
        // Otherwise it's an event
        if (!message.id) {
          handleCDPMessage(message);
        }
      } catch (err) {
        // Some messages might not be JSON
        if (data.toString().trim() && !data.toString().includes('ping')) {
          // Silently ignore non-JSON messages
        }
      }
    });
  });
}

// Handle CDP messages
function handleCDPMessage(message) {
  if (message.id) {
    // Response to our command
    return;
  }
  
  if (message.method) {
    // Event from Chrome
    handleCDPEvent(message.method, message.params);
  }
}

// Handle CDP events
function handleCDPEvent(method, params) {
  switch (method) {
    case 'Runtime.consoleAPICalled':
      handleConsoleEvent(params);
      break;
    case 'Runtime.exceptionThrown':
      handleException(params);
      break;
    case 'Network.requestWillBeSent':
      handleNetworkRequest(params);
      break;
    case 'Network.responseReceived':
      handleNetworkResponse(params);
      break;
    case 'Network.loadingFailed':
      handleNetworkError(params);
      break;
    case 'Network.loadingFinished':
      handleNetworkFinished(params);
      break;
    default:
      // Uncomment for debugging unknown events
      // log(`Unknown event: ${method}`, 'dim');
      break;
  }
}

// Handle console events
function handleConsoleEvent(params) {
  const { type, args, timestamp } = params;
  
  const messages = args.map(arg => {
    if (arg.type === 'string') return arg.value;
    if (arg.type === 'object') {
      try {
        return JSON.stringify(arg.value || arg.preview, null, 2);
      } catch {
        return arg.description || '[Object]';
      }
    }
    return arg.description || String(arg.value);
  }).join(' ');
  
  const time = new Date(timestamp).toLocaleTimeString();
  const url = params.executionContextId ? 'page' : 'unknown';
  
  let color = 'reset';
  let prefix = '';
  
  switch (type) {
    case 'error':
      color = 'red';
      prefix = '🔴 ERROR';
      break;
    case 'warning':
      color = 'yellow';
      prefix = '⚠️  WARN';
      break;
    case 'info':
      color = 'blue';
      prefix = 'ℹ️  INFO';
      break;
    case 'debug':
      color = 'cyan';
      prefix = '🐛 DEBUG';
      break;
    case 'log':
    default:
      color = 'green';
      prefix = '📝 LOG';
      break;
  }
  
  console.log(`${colors[color]}${prefix} [${time}] ${messages}${colors.reset}`);
}

// Handle exceptions
function handleException(params) {
  const { exception, timestamp } = params;
  const time = new Date(timestamp).toLocaleTimeString();
  
  const message = exception.description || exception.value || 'Unknown exception';
  const stack = exception.preview?.properties?.find(p => p.name === 'stack')?.value || '';
  
  console.log(`${colors.red}🔴 EXCEPTION [${time}] ${message}${colors.reset}`);
  if (stack) {
    console.log(`${colors.red}${stack}${colors.reset}`);
  }
}

// Handle network requests
function handleNetworkRequest(params) {
  const { request, requestId, timestamp } = params;
  const time = new Date(timestamp).toLocaleTimeString();
  
  const method = request.method || 'GET';
  const url = request.url || 'unknown';
  
  // Filter out noisy requests (images, fonts, etc.)
  const urlLower = url.toLowerCase();
  if (urlLower.match(/\.(jpg|jpeg|png|gif|svg|ico|woff|woff2|ttf|eot|css)$/)) {
    return;
  }
  
  // Filter out Google signaling/WebRTC requests (not critical)
  if (urlLower.includes('signaler') || urlLower.includes('punctual') || urlLower.includes('webrtc')) {
    return;
  }
  
  console.log(`${colors.cyan}🌐 REQUEST [${time}] ${method} ${url}${colors.reset}`);
  
  if (request.postData) {
    try {
      const postData = JSON.parse(request.postData);
      console.log(`${colors.dim}   Body: ${JSON.stringify(postData, null, 2)}${colors.reset}`);
    } catch {
      console.log(`${colors.dim}   Body: ${request.postData.substring(0, 200)}${colors.reset}`);
    }
  }
}

// Handle network responses
function handleNetworkResponse(params) {
  const { response, requestId, timestamp } = params;
  const time = new Date(timestamp).toLocaleTimeString();
  
  const status = response.status || 0;
  const url = response.url || 'unknown';
  const mimeType = response.mimeType || 'unknown';
  
  // Filter out noisy responses
  const urlLower = url.toLowerCase();
  if (urlLower.match(/\.(jpg|jpeg|png|gif|svg|ico|woff|woff2|ttf|eot|css)$/)) {
    return;
  }
  
  let color = 'green';
  if (status >= 400) color = 'red';
  else if (status >= 300) color = 'yellow';
  
  console.log(`${colors[color]}📥 RESPONSE [${time}] ${status} ${url} (${mimeType})${colors.reset}`);
}

// Handle network errors
function handleNetworkError(params) {
  const { requestId, errorText, timestamp } = params;
  const time = new Date(timestamp).toLocaleTimeString();
  
  console.log(`${colors.red}❌ NETWORK ERROR [${time}] ${errorText || 'Unknown error'}${colors.reset}`);
}

// Handle network finished
function handleNetworkFinished(params) {
  // Usually not needed, but can be used for timing
  // const { requestId, timestamp } = params;
}

// Send CDP command
function sendCommand(method, params = {}) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    error('WebSocket not connected');
    return Promise.reject(new Error('WebSocket not connected'));
  }
  
  return new Promise((resolve, reject) => {
    const id = Date.now() + Math.random();
    const message = {
      id,
      method,
      params
    };
    
    const timeout = setTimeout(() => {
      pendingCommands.delete(id);
      reject(new Error(`Command timeout: ${method}`));
    }, 8000); // 8 second timeout
    
    // Store the promise handlers
    pendingCommands.set(id, { resolve, reject });
    
    // Send command immediately
    try {
      ws.send(JSON.stringify(message));
    } catch (err) {
      pendingCommands.delete(id);
      clearTimeout(timeout);
      reject(new Error(`Failed to send command: ${err.message}`));
    }
  });
}

// Enable console and network monitoring
async function enableMonitoring() {
  try {
    // Enable Runtime domain for console events
    info('Enabling Runtime domain...');
    await sendCommand('Runtime.enable').catch(err => {
      warn(`Runtime.enable failed: ${err.message}, continuing...`);
    });
    success('Console monitoring enabled');
    
    // Enable Network domain for network events
    info('Enabling Network domain...');
    await sendCommand('Network.enable').catch(err => {
      warn(`Network.enable failed: ${err.message}, continuing...`);
    });
    success('Network monitoring enabled');
    
    // Enable Log domain for additional logs (optional)
    info('Enabling Log domain...');
    await sendCommand('Log.enable').catch(err => {
      // Log domain might not be available, that's OK
      warn(`Log.enable failed: ${err.message}, skipping...`);
    });
    
  } catch (err) {
    error(`Failed to enable monitoring: ${err.message}`);
    // Don't throw - try to continue anyway
    warn('Continuing with limited monitoring...');
  }
}

// Main function
async function main() {
  log('🚀 Chrome Remote Debugging Monitor Starting...', 'bright');
  log(`Connecting to Chrome on port ${DEBUG_PORT}...`, 'dim');
  
  // Get available tabs
  tabs = await getTabs();
  
  if (tabs.length === 0) {
    error('No tabs found. Make sure Chrome is running with --remote-debugging-port=' + DEBUG_PORT);
    process.exit(1);
  }
  
  info(`Found ${tabs.length} tab(s)`);
  
  // Filter to only page tabs (not chrome:// internal pages)
  const pageTabs = tabs.filter(tab => 
    tab.type === 'page' && 
    !tab.url.startsWith('chrome://') && 
    !tab.url.startsWith('chrome-extension://')
  );
  
  if (pageTabs.length === 0) {
    warn('No regular web pages found. Chrome tabs found:');
    tabs.forEach((tab, index) => {
      log(`  ${index + 1}. ${tab.title || tab.url}`, 'dim');
    });
    warn('💡 Please open a website (like chatgpt.com, gemini.google.com, etc.) and try again');
    process.exit(1);
  }
  
  // Use the first regular page tab
  activeTab = pageTabs[0];
  
  if (pageTabs.length > 1) {
    warn(`Multiple tabs found. Using: ${activeTab.title || activeTab.url}`);
    pageTabs.forEach((tab, index) => {
      log(`  ${index + 1}. ${tab.title || tab.url}`, 'dim');
    });
  }
  
  // Connect to the tab
  try {
    await connectToTab(activeTab);
    
    // Wait a bit for WebSocket to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await enableMonitoring();
    
    success('✅ Monitoring active! Console logs and network activity will appear below.');
    log('Press Ctrl+C to stop monitoring.', 'dim');
    log('─'.repeat(80), 'dim');
    
  } catch (err) {
    error(`Failed to start monitoring: ${err.message}`);
    warn('💡 Tip: Make sure Chrome has a page loaded (not just chrome://newtab)');
    warn('💡 Try navigating to a website first, then run the monitor again');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('\n👋 Shutting down...', 'yellow');
  if (ws) {
    ws.close();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\n👋 Shutting down...', 'yellow');
  if (ws) {
    ws.close();
  }
  process.exit(0);
});

// Start monitoring
main().catch(err => {
  error(`Fatal error: ${err.message}`);
  process.exit(1);
});

