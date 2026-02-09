#!/usr/bin/env node

/**
 * BrainBox API Test Script
 * Tests all API endpoints for functionality and authentication
 */

// Check Node.js version (fetch requires Node 18+)
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
if (majorVersion < 18) {
  console.error('❌ Error: Node.js 18+ is required. Current version:', nodeVersion);
  console.error('   Please upgrade Node.js to version 18 or higher.');
  process.exit(1);
}

const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '..', '.env.local');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '';

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

let authCookies = '';
let authToken = '';

// Test results
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
};

/**
 * Make HTTP request
 */
async function request(method, path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authCookies) {
    headers['Cookie'] = authCookies;
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: 'include',
    });

    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
    };
  }
}

/**
 * Test function wrapper
 */
async function test(name, testFn, options = {}) {
  const { skip = false, requireAuth = false } = options;
  
  if (skip) {
    console.log(`${colors.yellow}⏭  SKIP${colors.reset} ${name}`);
    results.skipped++;
    results.tests.push({ name, status: 'skipped' });
    return;
  }

  if (requireAuth && !authCookies && !authToken) {
    console.log(`${colors.yellow}⏭  SKIP${colors.reset} ${name} (no auth)`);
    results.skipped++;
    results.tests.push({ name, status: 'skipped', reason: 'no auth' });
    return;
  }

  try {
    const result = await testFn();
    if (result.ok) {
      console.log(`${colors.green}✓ PASS${colors.reset} ${name} (${result.status})`);
      results.passed++;
      results.tests.push({ name, status: 'passed', statusCode: result.status });
    } else {
      console.log(`${colors.red}✗ FAIL${colors.reset} ${name} (${result.status || 'ERROR'})`);
      if (result.error) {
        console.log(`  ${colors.red}Error:${colors.reset} ${result.error}`);
      }
      if (result.data && typeof result.data === 'object') {
        console.log(`  ${colors.red}Response:${colors.reset}`, JSON.stringify(result.data, null, 2).substring(0, 200));
      }
      results.failed++;
      results.tests.push({ name, status: 'failed', statusCode: result.status, error: result.error });
    }
  } catch (error) {
    console.log(`${colors.red}✗ FAIL${colors.reset} ${name} (EXCEPTION)`);
    console.log(`  ${colors.red}Error:${colors.reset} ${error.message}`);
    results.failed++;
    results.tests.push({ name, status: 'failed', error: error.message });
  }
}

/**
 * Authenticate user
 */
async function authenticate() {
  console.log(`\n${colors.cyan}${colors.bright}🔐 Authenticating...${colors.reset}\n`);

  // Try to sign in
  const signInResult = await request('POST', '/api/auth/signin', {
    body: {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    },
  });

  if (signInResult.ok && signInResult.headers['set-cookie']) {
    authCookies = signInResult.headers['set-cookie'].join('; ');
    console.log(`${colors.green}✓ Authenticated via cookies${colors.reset}\n`);
    return true;
  }

  // If sign in fails, try to get token from extension-auth
  const tokenResult = await request('GET', '/extension-auth');
  if (tokenResult.ok && tokenResult.data?.token) {
    authToken = tokenResult.data.token;
    console.log(`${colors.green}✓ Authenticated via token${colors.reset}\n`);
    return true;
  }

  console.log(`${colors.yellow}⚠ No authentication available - some tests will be skipped${colors.reset}\n`);
  return false;
}

/**
 * Run all API tests
 */
async function runTests() {
  console.log(`${colors.bright}${colors.cyan}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║${colors.reset}  ${colors.bright}BrainBox API Test Suite${colors.reset}                    ${colors.cyan}║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚═══════════════════════════════════════════════════════════╝${colors.reset}\n`);
  console.log(`Base URL: ${colors.cyan}${BASE_URL}${colors.reset}\n`);

  // Authenticate first
  await authenticate();

  console.log(`${colors.bright}${colors.blue}📋 Running API Tests...${colors.reset}\n`);

  // ============================================
  // AUTHENTICATION ENDPOINTS
  // ============================================
  console.log(`${colors.bright}${colors.cyan}Authentication${colors.reset}`);
  console.log(`${colors.cyan}─────────────────────────────────────────${colors.reset}`);

  await test('OPTIONS /api/auth/refresh', () => request('OPTIONS', '/api/auth/refresh'));
  await test('POST /api/auth/refresh (no token)', () => request('POST', '/api/auth/refresh'), { requireAuth: false });

  // ============================================
  // FOLDERS ENDPOINTS
  // ============================================
  console.log(`\n${colors.bright}${colors.cyan}Folders${colors.reset}`);
  console.log(`${colors.cyan}─────────────────────────────────────────${colors.reset}`);

  await test('OPTIONS /api/folders', () => request('OPTIONS', '/api/folders'));
  await test('GET /api/folders', () => request('GET', '/api/folders'), { requireAuth: true });
  
  let createdFolderId = null;
  await test('POST /api/folders', async () => {
    const result = await request('POST', '/api/folders', {
      body: {
        name: 'Test Folder',
        color: '#6366f1',
        type: 'chat',
      },
    });
    if (result.ok && result.data?.id) {
      createdFolderId = result.data.id;
    }
    return result;
  }, { requireAuth: true });

  if (createdFolderId) {
    await test('PUT /api/folders', () => request('PUT', '/api/folders', {
      body: {
        id: createdFolderId,
        name: 'Updated Test Folder',
      },
    }), { requireAuth: true });

    await test('DELETE /api/folders', () => request('DELETE', `/api/folders?id=${createdFolderId}`), { requireAuth: true });
  }

  // ============================================
  // CHATS ENDPOINTS
  // ============================================
  console.log(`\n${colors.bright}${colors.cyan}Chats${colors.reset}`);
  console.log(`${colors.cyan}─────────────────────────────────────────${colors.reset}`);

  await test('GET /api/chats', () => request('GET', '/api/chats'), { requireAuth: true });
  await test('POST /api/chats', () => request('POST', '/api/chats', {
    body: {
      title: 'Test Chat',
      content: 'Test content',
      platform: 'chatgpt',
    },
  }), { requireAuth: true });
  await test('GET /api/chats/extension', () => request('GET', '/api/chats/extension'), { requireAuth: true });

  // ============================================
  // PROMPTS ENDPOINTS
  // ============================================
  console.log(`\n${colors.bright}${colors.cyan}Prompts${colors.reset}`);
  console.log(`${colors.cyan}─────────────────────────────────────────${colors.reset}`);

  await test('GET /api/prompts', () => request('GET', '/api/prompts'), { requireAuth: false });
  await test('GET /api/prompts?use_in_context_menu=true', () => request('GET', '/api/prompts?use_in_context_menu=true'), { requireAuth: false });
  
  await test('POST /api/prompts/search', () => request('POST', '/api/prompts/search', {
    body: {
      query: 'test query',
    },
  }), { requireAuth: false });

  await test('GET /api/prompts/categories', () => request('GET', '/api/prompts/categories'), { requireAuth: false });
  await test('GET /api/prompts/by-category?category=Development', () => request('GET', '/api/prompts/by-category?category=Development'), { requireAuth: false });
  await test('GET /api/prompts/proxy-csv', () => request('GET', '/api/prompts/proxy-csv'), { requireAuth: false });

  let createdPromptId = null;
  await test('POST /api/prompts', async () => {
    const result = await request('POST', '/api/prompts', {
      body: {
        title: 'Test Prompt',
        content: 'Test prompt content',
        color: '#6366f1',
      },
    });
    if (result.ok && result.data?.id) {
      createdPromptId = result.data.id;
    }
    return result;
  }, { requireAuth: true });

  if (createdPromptId) {
    await test('PUT /api/prompts', () => request('PUT', '/api/prompts', {
      body: {
        id: createdPromptId,
        title: 'Updated Test Prompt',
      },
    }), { requireAuth: true });

    await test('DELETE /api/prompts', () => request('DELETE', `/api/prompts?id=${createdPromptId}`), { requireAuth: true });
  }

  // ============================================
  // IMAGES ENDPOINTS
  // ============================================
  console.log(`\n${colors.bright}${colors.cyan}Images${colors.reset}`);
  console.log(`${colors.cyan}─────────────────────────────────────────${colors.reset}`);

  await test('OPTIONS /api/images', () => request('OPTIONS', '/api/images'));
  await test('GET /api/images', () => request('GET', '/api/images'), { requireAuth: true });
  await test('POST /api/images', () => request('POST', '/api/images', {
    body: {
      url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      name: 'test.png',
    },
  }), { requireAuth: true });

  // ============================================
  // STATS ENDPOINTS
  // ============================================
  console.log(`\n${colors.bright}${colors.cyan}Stats${colors.reset}`);
  console.log(`${colors.cyan}─────────────────────────────────────────${colors.reset}`);

  await test('OPTIONS /api/stats', () => request('OPTIONS', '/api/stats'));
  await test('GET /api/stats', () => request('GET', '/api/stats'), { requireAuth: true });

  // ============================================
  // EXPORT/IMPORT ENDPOINTS
  // ============================================
  console.log(`\n${colors.bright}${colors.cyan}Export/Import${colors.reset}`);
  console.log(`${colors.cyan}─────────────────────────────────────────${colors.reset}`);

  await test('GET /api/export', () => request('GET', '/api/export'), { requireAuth: true });
  await test('POST /api/import', () => request('POST', '/api/import', {
    body: {
      chats: [],
      folders: [],
    },
  }), { requireAuth: true });

  // ============================================
  // ACCOUNT ENDPOINTS
  // ============================================
  console.log(`\n${colors.bright}${colors.cyan}Account${colors.reset}`);
  console.log(`${colors.cyan}─────────────────────────────────────────${colors.reset}`);

  await test('DELETE /api/account/delete', () => request('DELETE', '/api/account/delete'), { 
    requireAuth: true,
    skip: true, // Skip by default - this deletes the account!
  });

  // ============================================
  // AI ENDPOINTS
  // ============================================
  console.log(`\n${colors.bright}${colors.cyan}AI${colors.reset}`);
  console.log(`${colors.cyan}─────────────────────────────────────────${colors.reset}`);

  await test('POST /api/ai/generate', () => request('POST', '/api/ai/generate', {
    body: {
      prompt: 'Test prompt',
    },
  }), { requireAuth: true });
  
  await test('POST /api/ai/enhance-prompt', () => request('POST', '/api/ai/enhance-prompt', {
    body: {
      prompt: 'Test prompt',
    },
  }), { requireAuth: true });

  // ============================================
  // PROXY ENDPOINTS
  // ============================================
  console.log(`\n${colors.bright}${colors.cyan}Proxy${colors.reset}`);
  console.log(`${colors.cyan}─────────────────────────────────────────${colors.reset}`);

  await test('GET /api/proxy-image?url=https://example.com/image.png', () => 
    request('GET', '/api/proxy-image?url=https://example.com/image.png'), 
    { requireAuth: false }
  );

  // ============================================
  // UPLOAD ENDPOINTS
  // ============================================
  console.log(`\n${colors.bright}${colors.cyan}Upload${colors.reset}`);
  console.log(`${colors.cyan}─────────────────────────────────────────${colors.reset}`);

  await test('POST /api/upload', () => request('POST', '/api/upload', {
    body: {
      file: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    },
  }), { requireAuth: true });

  // Print summary
  console.log(`\n${colors.bright}${colors.cyan}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║${colors.reset}  ${colors.bright}Test Summary${colors.reset}                                    ${colors.cyan}║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚═══════════════════════════════════════════════════════════╝${colors.reset}\n`);

  const total = results.passed + results.failed + results.skipped;
  console.log(`${colors.green}✓ Passed:${colors.reset} ${results.passed}`);
  console.log(`${colors.red}✗ Failed:${colors.reset} ${results.failed}`);
  console.log(`${colors.yellow}⏭  Skipped:${colors.reset} ${results.skipped}`);
  console.log(`${colors.cyan}Total:${colors.reset} ${total}\n`);

  if (results.failed > 0) {
    console.log(`${colors.red}${colors.bright}Failed Tests:${colors.reset}\n`);
    results.tests
      .filter(t => t.status === 'failed')
      .forEach(t => {
        console.log(`  ${colors.red}✗${colors.reset} ${t.name}`);
        if (t.error) console.log(`    ${colors.red}Error:${colors.reset} ${t.error}`);
      });
    console.log();
  }

  // Exit with error code if tests failed
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}${colors.bright}Fatal Error:${colors.reset}`, error);
  process.exit(1);
});

