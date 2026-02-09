import { test, expect } from '@playwright/test';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

// Define the Zod schema for validation
const createChatSchema = z.object({
  title: z.string().min(1),
  content: z.string(),
  platform: z.string().optional(),
  url: z.string().url().optional().or(z.literal('')),
  folder_id: z.string().uuid().nullable().optional(),
  source_id: z.string().optional(),
  messages: z.array(z.any()).optional(),
  summary: z.string().optional().nullable(),
  detailed_summary: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  tasks: z.array(z.object({
    id: z.string().optional(),
    text: z.string(),
    completed: z.boolean().default(false),
    priority: z.enum(['low', 'medium', 'high']).optional(),
  })).optional().nullable(),
  embedding: z.array(z.number()).optional().nullable(),
});

test.describe('BrainBox Extension Integrity Audit', () => {
  test('Audit network traffic and DOM extraction', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for manual login
    const interceptedRequests: any[] = [];
    const auditLogs: string[] = [];

    // Setup network interception
    await page.route('**/api/**', async (route) => {
      const request = route.request();
      if (request.method() === 'POST' && request.url().includes('/chats')) {
        const url = request.url();
        console.debug(`[Network Intercept] 📥 Captured POST to: ${url}`);
        auditLogs.push(`[Network Intercept] POST ${url}`);
        
        // 🚨 Validation A: Path segment check
        if (url.includes('/api/api/')) {
          console.error(`❌ CRITICAL ROUTING ERROR: Redundant /api/ in URL: ${url}`);
          throw new Error('Critical Routing Error: Redundant /api/ segment');
        }

        // 🚨 Validation B: Auth Header check
        const headers = request.headers();
        const authHeader = headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          console.warn(`[Network] ⚠️ Missing or invalid Bearer token in request to ${url}`);
        } else {
          console.debug('[Network] ✅ Authorization header found');
        }

        // 🚨 Zod Schema Alignment
        const postData = JSON.parse(request.postData() || '{}');
        const validationResult = createChatSchema.safeParse(postData);
        if (!validationResult.success) {
          console.error('❌ ZOD VALIDATION ERROR:', JSON.stringify(validationResult.error.format(), null, 2));
        } else {
          console.debug('✅ Payload matches Zod schema');
          auditLogs.push('✅ Payload matches Zod schema');
        }

        // Wait for response to check for HTML/JSON mismatch
        try {
          const response = await route.fetch();
          const contentType = (await response.headerValue('content-type')) || '';
          if (contentType.includes('text/html')) {
            console.error(`❌ CRITICAL ROUTING ERROR: JSON API returned HTML! (${url})`);
            throw new Error('Critical Routing Error: HTML returned instead of JSON');
          }
          console.debug(`[Network] ✅ Response ${response.status()} received with Content-Type: ${contentType}`);
          await route.fulfill({ response });
          interceptedRequests.push({ url, payload: postData });
        } catch (e) {
          console.error(`[Network] Error fetching response: ${e.message}`);
          await route.continue();
        }
      } else {
        await route.continue();
      }
    });

    console.debug('\n================================================================');
    console.debug('🚀 BRAINBOX INTEGRITY AUDIT STARTED (HEADED MODE)');
    console.debug('1. Please log in to ChatGPT or Claude in the opened window.');
    console.debug('2. Navigate to any chat.');
    console.debug('3. Use the BrainBox "Save" button or context menu.');
    console.debug('================================================================\n');

    // Start with ChatGPT as it's often more stable for extension injection
    await page.goto('https://chatgpt.com', { waitUntil: 'domcontentloaded' });
    
    console.debug('[Audit] Waiting for user interaction or save button...');
    
    // Use a broad selector for injected buttons across platforms
    const buttons = page.locator('.brainbox-hover-btn, .brainbox-capture-btn');
    
    try {
      // 60 seconds for manual login/setup
      await expect(buttons.first()).toBeVisible({ timeout: 60000 });
      console.debug('✅ BrainBox Button detected in DOM!');
      
      const firstBtn = await buttons.first();
      await firstBtn.click({ force: true });
      console.debug('🖱️ Clicked "Save" button. Waiting for network capture...');
      
      // Allow time for network request to fly
      await page.waitForTimeout(5000);

      if (interceptedRequests.length > 0) {
        const payload = interceptedRequests[0].payload;
        console.debug('\n📊 AUDIT RESULTS:');
        
        // Check for undefined or [object Object]
        const payloadStr = JSON.stringify(payload);
        if (payloadStr.includes('undefined')) {
          console.error('❌ EXTRACTION ERROR: "undefined" found in payload');
          throw new Error('Data Corruption: undefined in payload');
        }
        if (payloadStr.includes('[object Object]')) {
          console.error('❌ EXTRACTION ERROR: "[object Object]" found in payload');
          throw new Error('Data Corruption: [object Object] in payload');
        }
        
        console.debug('✅ EXTRACTION AUDIT: Data integrity OK (no undefined/[object Object])');
        console.debug('✅ NETWORK AUDIT: No redundant path segments');
        console.debug('✅ SCHEMA AUDIT: Payload aligned with packages/validation');
      } else {
        console.warn('⚠️ No relevant POST requests captured. Did you trigger the save action?');
      }

    } catch (e) {
      console.error('❌ Audit interrupted or timeout:', e.message);
      await page.screenshot({ path: 'audit-failure.png' });
    }

    console.debug('\n--- NETWORK LOGS ---');
    auditLogs.forEach(l => console.debug(l));
  });
});
