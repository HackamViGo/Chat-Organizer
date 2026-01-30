#!/usr/bin/env node
/**
 * BrainBox Multi-Target Monitor
 * 
 * Monitors ALL open tabs, iframes, and service workers in the debugged Chrome.
 * Features:
 * - Direct connection to multiple targets
 * - Monitors Console and Network for all regular pages
 * - Monitors Service Worker console logs
 * - Auto-refreshes target list
 */

const WebSocket = require('ws');

// Configuration
const DEBUG_PORT = process.env.CHROME_DEBUG_PORT || 9222;
const REFRESH_INTERVAL = 3000; // Refresh target list every 3s

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
  white: '\x1b[37m'
};

// Global state
const activeConnections = new Map(); // id -> { ws, title, type }

function log(message, color = 'reset') {
  const time = new Date().toLocaleTimeString();
  console.log(`${colors[color]}[${time}] ${message}${colors.reset}`);
}

async function getTargets() {
  try {
    const res = await fetch(`http://localhost:${DEBUG_PORT}/json`);
    return await res.json();
  } catch (err) {
    return [];
  }
}

async function connectToTarget(target) {
  if (activeConnections.has(target.id)) return;
  if (!target.webSocketDebuggerUrl) return;

  // Filter: exclude DevTools and internal Chrome pages
  if (target.url.startsWith('chrome://') || target.url.startsWith('devtools://')) return;

  const targetType = target.type.toUpperCase();
  const targetLabel = target.title || target.url;

  try {
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    
    activeConnections.set(target.id, { 
      ws, 
      label: targetLabel, 
      type: target.type 
    });

    ws.on('open', async () => {
      log(`🔗 Connected to [${targetType}]: ${targetLabel}`, 'green');
      
      // Enable basic monitoring domains
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));
      
      // Enable Network only for regular pages to avoid huge spam
      if (target.type === 'page') {
        ws.send(JSON.stringify({ id: 3, method: 'Network.enable' }));
      }
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      handleMessage(target, msg);
    });

    ws.on('close', () => {
      log(`❌ Disconnected: ${targetLabel}`, 'yellow');
      activeConnections.delete(target.id);
    });

    ws.on('error', (err) => {
      activeConnections.delete(target.id);
    });

  } catch (err) {
    log(`Failed to connect to ${targetLabel}: ${err.message}`, 'red');
  }
}

function handleMessage(target, msg) {
  const sourceLabel = `[${target.title || 'Target'}]`;
  const typeColor = target.type === 'service_worker' ? 'magenta' : 'reset';

  // 1. Console Events
  if (msg.method === 'Runtime.consoleAPICalled') {
    const { type, args } = msg.params;
    const text = args.map(a => a.value || a.description).join(' ');
    
    let color = 'white';
    if (type === 'error') color = 'red';
    else if (type === 'warning') color = 'yellow';
    else if (type === 'info') color = 'blue';

    console.log(`${colors[typeColor]}${sourceLabel}${colors.reset} ${colors[color]}${type.toUpperCase()}: ${text}${colors.reset}`);
  }

  // 2. Exceptions
  if (msg.method === 'Runtime.exceptionThrown') {
    const details = msg.params.exceptionDetails;
    const text = details.exception?.description || details.text;
    console.log(`${colors.red}${sourceLabel} 🔴 EXCEPTION: ${text}${colors.reset}`);
  }

  // 3. Network Events (Simplified)
  if (msg.method === 'Network.requestWillBeSent') {
    const { request } = msg.params;
    // Skip static assets
    if (!request.url.match(/\.(png|jpg|css|js|woff2|svg)/)) {
        console.log(`${colors.dim}${sourceLabel} 🌐 ${request.method} ${request.url.substring(0, 100)}...${colors.reset}`);
    }
  }

  if (msg.method === 'Network.responseReceived') {
    const { response } = msg.params;
    if (response.status >= 400) {
        console.log(`${colors.red}${sourceLabel} 📥 STATUS ${response.status}: ${response.url}${colors.reset}`);
    }
  }
}

async function monitor() {
  log('🚀 BrainBox Multi-Target Monitor Active', 'bright');
  log(`Listening on port ${DEBUG_PORT}...`, 'dim');
  console.log('─'.repeat(80));

  while (true) {
    const targets = await getTargets();
    for (const target of targets) {
      await connectToTarget(target);
    }
    await new Promise(r => setTimeout(r, REFRESH_INTERVAL));
  }
}

// Graceful exit
process.on('SIGINT', () => {
  log('\nStopping monitor...', 'yellow');
  for (const conn of activeConnections.values()) {
    conn.ws.close();
  }
  process.exit(0);
});

monitor();
