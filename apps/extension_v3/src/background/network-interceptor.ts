import { AuthManager } from './auth-manager';

const TOKEN_PATTERNS: Record<string, RegExp> = {
  chatgpt: /^https:\/\/chatgpt\.com\/backend-api\//,
  claude: /^https:\/\/claude\.ai\/api\//,
};

export function initNetworkInterceptor() {
  chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
      const headers = details.requestHeaders ?? [];

      // ChatGPT — Bearer token от Authorization header
      if (TOKEN_PATTERNS.chatgpt.test(details.url)) {
        const authHeader = headers.find(
          h => h.name.toLowerCase() === 'authorization'
        );
        if (authHeader?.value?.startsWith('Bearer ')) {
          const token = authHeader.value.replace('Bearer ', '').trim();
          AuthManager.storePlatformAuth('chatgpt', { bearerToken: token, capturedAt: Date.now() });
        }
      }

      // Claude — извлича org_id от URL pattern
      if (TOKEN_PATTERNS.claude.test(details.url)) {
        const orgMatch = details.url.match(
          /\/api\/organizations\/([a-f0-9-]+)\//
        );
        if (orgMatch) {
          AuthManager.storePlatformAuth('claude', { orgId: orgMatch[1], capturedAt: Date.now() });
        }
      }
    },
    {
      urls: [
        'https://chatgpt.com/backend-api/*',
        'https://claude.ai/api/*',
      ]
    },
    ['requestHeaders']
  );
}
