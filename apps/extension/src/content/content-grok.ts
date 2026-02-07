// BrainBox - Grok Content Script
import { logger } from '../lib/logger';
import { BrainBoxUI } from '../lib/ui';

const PLATFORM = 'grok';
let ui: BrainBoxUI | null = null;

chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
    if (request.action === 'triggerSaveChat') {
        handleSave();
    }
});

function showToast(message: string, type: string) {
    if ((window as any).BrainBoxUI) {
        if (!ui) ui = new (window as any).BrainBoxUI();
        ui!.showToast(message, type);
    } else {
        logger.info('Grok', `[Toast] ${message}`);
    }
}

async function handleSave() {
    const url = window.location.href;
    let conversationId = null;

    // Try to get ID from URL params
    const urlObj = new URL(url);
    conversationId = urlObj.searchParams.get('id') || 
                     urlObj.searchParams.get('conversation') || 
                     urlObj.searchParams.get('convo');

    if (!conversationId) {
        // Support /chat/, /grok/, and /c/ prefixes
        const pathMatch = url.match(/\/(?:chat|grok|c)\/([a-zA-Z0-9-]+)/);
        if (pathMatch) {
            conversationId = pathMatch[1];
        }
    }

    if (!conversationId) {
        showToast('Could not find conversation ID in URL', 'error');
        return;
    }

    // Scrape payload as fallback
    const payload: { title: string, messages: any[] } = {
        title: document.title.replace(' - Grok', ''),
        messages: []
    };
    
    try {
        const mainContainer = document.querySelector('main');
        if (mainContainer) {
            const fullText = (mainContainer as HTMLElement).innerText;
            
            if (fullText.trim().length > 0) {
                payload.messages.push({
                    role: 'assistant',
                    content: fullText,
                    timestamp: Date.now()
                });
            }
        }
    } catch (e) {
        logger.error('Grok', 'Scraping failed', e);
    }

    chrome.runtime.sendMessage({
        action: 'getConversation',
        platform: PLATFORM,
        conversationId,
        url,
        payload
    }, (response: any) => {
        if (response && response.success) {
            chrome.runtime.sendMessage({
                action: 'saveToDashboard',
                data: response.data,
                folderId: null,
                silent: false
            }, (saveResponse: any) => {
                if (saveResponse && saveResponse.success) {
                    showToast('Chat saved to BrainBox!', 'success');
                } else {
                    showToast('Save failed: ' + (saveResponse?.error || 'Unknown error'), 'error');
                }
            });
        } else {
            showToast('Fetch failed: ' + (response?.error || 'Could not retrieve chat'), 'error');
        }
    });
}
