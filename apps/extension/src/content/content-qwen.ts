// BrainBox - Qwen Content Script
import { logger } from '../lib/logger';
import { BrainBoxUI } from '../lib/ui';

const PLATFORM = 'qwen';
let ui: BrainBoxUI | null = null;

chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
    if (request.action === 'triggerSaveChat') {
        handleSave();
    }
});

async function handleSave() {
    const url = window.location.href;
    const match = url.match(/\/(?:chat|c)\/([a-zA-Z0-9_-]+)/);
    
    if (!match) {
        showToast('Could not detect Qwen session ID.', 'error');
        return;
    }

    const conversationId = match[1];

    const payload: { title: string, messages: any[] } = {
        title: document.title.replace(' - Qwen', ''),
        messages: []
    };

    try {
        const main = document.querySelector('main');
        if (main) {
            const fullText = (main as HTMLElement).innerText;
            
            if (fullText.trim().length > 0) {
                 payload.messages.push({
                    role: 'assistant',
                    content: fullText,
                    timestamp: Date.now()
                });
            }
        }
    } catch (e) {
        logger.error('Qwen', 'Scraping failed', e);
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
                    showToast('Qwen chat saved successfully!', 'success');
                } else {
                    showToast('Save failed: ' + (saveResponse?.error || 'Unknown error'), 'error');
                }
            });
        } else {
            showToast('Fetch failed: ' + (response?.error || 'Check your connection or refresh'), 'error');
        }
    });
}

function showToast(message: string, type: string) {
    if ((window as any).BrainBoxUI) {
        if (!ui) ui = new (window as any).BrainBoxUI();
        ui!.showToast(message, type);
    } else {
        logger.info('Qwen', `[Toast] ${message}`);
    }
}
