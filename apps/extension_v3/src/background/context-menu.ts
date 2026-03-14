import type { Platform } from '../shared/types';

const PLATFORM_PATTERNS: Record<Platform, string[]> = {
  gemini: ['https://gemini.google.com/*'],
  chatgpt: ['https://chatgpt.com/*'],
  claude: ['https://claude.ai/*'],
  grok: ['https://grok.com/*'],
  perplexity: ['https://www.perplexity.ai/*']
};

function createMenus() {
  chrome.contextMenus.create({
    id: 'brainbox-save-chat',
    title: 'BrainBox: Save Chat',
    contexts: ['page'],
    documentUrlPatterns: Object.values(PLATFORM_PATTERNS).flat()
  }, () => {
    // Ignore error if menu already exists
    if (chrome.runtime.lastError) { }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  createMenus();
});

// For Vite HMR robust reload:
createMenus();

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'brainbox-save-chat') return;
  if (!tab?.id || !tab?.url) return;

  const platform = detectPlatform(tab.url);
  if (!platform) return;

  chrome.tabs.sendMessage(tab.id, {
    action: 'triggerSaveChat',
    platform,
    url: tab.url,
    title: tab.title
  }).catch(() => {
    // Expected to fail if content script is not injected yet
  });
});

function detectPlatform(url: string): Platform | null {
  if (url.includes('gemini.google.com')) return 'gemini';
  if (url.includes('chatgpt.com')) return 'chatgpt';
  if (url.includes('claude.ai')) return 'claude';
  if (url.includes('grok.com')) return 'grok';
  if (url.includes('perplexity.ai')) return 'perplexity';
  return null;
}
