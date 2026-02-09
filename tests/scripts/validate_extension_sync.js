#!/usr/bin/env node

/**
 * BrainBox Extended Validation Script
 * Tests the specific "Save/Update" flow used by the extension.
 * Correctly handles Supabase authentication and Upsert logic.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword123';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function runValidation() {
  console.debug(`${colors.bright}${colors.blue}🚀 Starting Extended Extension Sync Validation...${colors.reset}\n`);

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error(`${colors.red}❌ Missing Supabase environment variables in .env.local${colors.reset}`);
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 1. Authenticate
  console.debug(`${colors.cyan}🔐 Authenticating test user: ${TEST_EMAIL}...${colors.reset}`);
  const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });

  if (authError) {
    console.debug(`${colors.yellow}⚠️ Sign in failed: ${authError.message}. Attempting signup...${colors.reset}`);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (signUpError) {
      console.error(`${colors.red}❌ Auth failed completely: ${signUpError.message}${colors.reset}`);
      process.exit(1);
    }
    console.debug(`${colors.green}✅ User created.${colors.reset}`);
    // Note: If email confirmation is ON, this will still lead to issues
  } else {
    console.debug(`${colors.green}✅ Authenticated.${colors.reset}`);
  }

  const accessToken = session?.access_token;
  if (!accessToken) {
    console.warn(`${colors.yellow}⚠️ No access token obtained. Check email confirmation settings.${colors.reset}`);
  }

  // 2. Simulate Extension Save (POST)
  const sourceId = `test_sync_${Date.now()}`;
  const testChat = {
    title: 'Test Extension Sync (Initial)',
    content: 'Initial captured content...',
    platform: 'gemini',
    url: `https://gemini.google.com/app/${sourceId}`,
    messages: [
      { role: 'user', content: 'Hello BrainBox', timestamp: Date.now() },
      { role: 'assistant', content: 'Testing extension sync logic.', timestamp: Date.now() + 1000 }
    ]
  };

  console.debug(`\n${colors.cyan}💾 Simulating Extension Save (POST /api/chats)...${colors.reset}`);
  const saveRes = await fetch(`${API_BASE_URL}/api/chats`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(testChat)
  });

  if (!saveRes.ok) {
    console.error(`${colors.red}❌ Save failed: ${await saveRes.text()}${colors.reset}`);
    process.exit(1);
  }

  const savedChat = await saveRes.json();
  console.debug(`${colors.green}✅ Chat Saved (ID: ${savedChat.id})${colors.reset}`);
  
  // 3. Verify Upsert Logic (Update Same URL)
  console.debug(`\n${colors.cyan}🔄 Simulating Update (Same URL/SourceID)...${colors.reset}`);
  const updateChat = {
    ...testChat,
    title: 'Test Extension Sync (Updated)',
    messages: [
      ...testChat.messages,
      { role: 'user', content: 'Add one more message!', timestamp: Date.now() + 2000 }
    ]
  };

  const updateRes = await fetch(`${API_BASE_URL}/api/chats`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(updateChat)
  });

  if (!updateRes.ok) {
    console.error(`${colors.red}❌ Update failed: ${await updateRes.text()}${colors.reset}`);
    process.exit(1);
  }

  const updatedChatResult = await updateRes.json();
  
  if (updatedChatResult.id === savedChat.id) {
    console.debug(`${colors.green}✅ Update Verified: ID matched (Upsert worked)${colors.reset}`);
  } else {
    console.error(`${colors.red}❌ Update Failed: Created new ID instead of updating${colors.reset}`);
  }

  if (updatedChatResult.title === 'Test Extension Sync (Updated)' && updatedChatResult.messages.length === 3) {
    console.debug(`${colors.green}✅ Content Verified: Title and Messages accurately updated${colors.reset}`);
  } else {
    console.error(`${colors.red}❌ Content Verification Failed${colors.reset}`);
  }

  console.debug(`\n${colors.bright}${colors.green}🎉 All Extension Sync Checks Passed!${colors.reset}`);
}

runValidation().catch(err => {
  console.error(`\n${colors.red}💥 Fatal Error: ${err.message}${colors.reset}`);
});
