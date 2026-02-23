# Blind Spots Audit Report

This report documents critical security, performance, and stability blind spots across the BrainBox monorepo that were identified during a deep-dive architectural audit.

### 1. Database Security & RLS (Supabase)
**Vulnerability Identified:**
The repository lacks explicit Supabase database migrations containing Row Level Security (RLS) policies for core tables (`chats`, `folders`, `prompts`). Because the Next.js dashboard utilizes `@supabase/ssr` with the public `NEXT_PUBLIC_SUPABASE_ANON_KEY`, the Supabase REST API is accessible from the client side. Without stringent RLS policies enforced directly at the database level, a malicious actor can bypass the Next.js API and query Supabase directly to read, modify, or delete other users' data.

**Actionable Recommendation:**
Create explicit SQL migrations in a `supabase/migrations/` directory that enforce RLS for all user-owned tables.
```sql
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Ensure users can only access their own data
CREATE POLICY "Users can select their own chats" 
ON chats FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chats" 
ON chats FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats" 
ON chats FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats" 
ON chats FOR DELETE USING (auth.uid() = user_id);
```

### 2. Browser Memory Leaks (Extension Content Scripts)
**Vulnerability Identified:**
In extension content scripts (e.g., `content-claude.js`, `content-chatgpt.js`), `MutationObserver` instances are instantiated to watch for DOM changes, but they are only disconnected when the tab becomes inactive. Because ChatGPT, Claude, and other AI platforms are Single Page Applications (SPAs), navigating between chats does not reload the page or trigger standard tab inactivity. When the extension re-initializes upon SPA route changes, it leaves orphaned observers and duplicated `addEventListener` attachments running simultaneously. This will cause cascading memory leaks, extreme CPU spikes, and eventual browser tab crashes.

**Actionable Recommendation:**
Maintain global references to observers and event abort controllers, and forcefully clean them up before re-initializing the scripts on SPA navigations.
```typescript
// 1. Manage MutationObservers
if (window._brainboxContentObserver) {
  window._brainboxContentObserver.disconnect();
}
window._brainboxContentObserver = new MutationObserver((mutations) => { /* ... */ });
window._brainboxContentObserver.observe(document.body, { childList: true, subtree: true });

// 2. Manage EventListeners using AbortController
if (window._brainboxAbortController) {
  window._brainboxAbortController.abort();
}
window._brainboxAbortController = new AbortController();
document.addEventListener('keydown', handleKeydown, { 
  signal: window._brainboxAbortController.signal 
});
```

### 3. Rate Limiting & API Abuse (Dashboard)
**Vulnerability Identified:**
Neither `apps/dashboard/src/middleware.ts` nor the backend API routes (`/api/ai/*`) implement any form of rate limiting. An attacker or bot can easily write a simple script to spam the expensive OpenAI/Gemini endpoints, bypassing typical frontend restrictions. This can result in rapid depletion of the project's AI API credits (Denial of Wallet) and degrade service for legitimate users.

**Actionable Recommendation:**
Implement Edge-compatible rate limiting (using Upstash Redis or Vercel KV) within Next.js Middleware or directly on the expensive `/api/ai/*` API routes.
```typescript
// apps/dashboard/src/app/api/ai/generate/route.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 m"), // Max 5 AI generates per minute per IP
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { 
      status: 429,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  // Proceed with expensive AI generation...
}
```

### 4. Production Telemetry & Error Handling
**Vulnerability Identified:**
The custom logging utility (`apps/dashboard/src/lib/logger.ts`) and the extension's background scripts exclusively route errors to `console.error` and `console.debug`. In a production environment, these logs are siloed in the individual user's browser console. If an AI platform (e.g., Claude) updates its DOM structure and breaks the extension's parsers, the errors will be silently swallowed. Maintainers will have no visibility into the breakage until users complain or leave negative reviews.

**Actionable Recommendation:**
Integrate a centralized telemetry and crash reporting system (e.g., Sentry, PostHog, or Datadog) to asynchronously capture unhandled exceptions and structural errors.
```typescript
// apps/dashboard/src/lib/logger.ts
import * as Sentry from "@sentry/nextjs"; // or @sentry/browser for the extension

export const logger = {
  // ... debug routines ...

  error: (area: string, msg: string, err?: any) => {
    const timestamp = new Date().toISOString();
    
    // Console log for local debugging
    console.error(`[${timestamp}] [${area}] 🚨 ${msg}`, err !== undefined ? err : '');
    
    // Ship to error tracking in production
    if (!CONFIG.IS_DEV) {
      Sentry.captureException(err || new Error(msg), {
        tags: { area },
        extra: { message: msg }
      });
    }
  },
};
```
