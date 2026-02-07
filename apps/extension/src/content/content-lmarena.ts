// BrainBox - LMSYS Arena Content Script
import { logger } from '../lib/logger';
import { BrainBoxUI } from '../lib/ui';

const PLATFORM = 'lmarena';
let ui: BrainBoxUI | null = null;

chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
    if (request.action === 'triggerSaveChat') {
        handleSave();
    }
});

async function handleSave() {
    const url = window.location.href;
    
    // Extract ID from URL (supports /c/{uuid})
    let conversationId = 'current_session';
    const pathMatch = url.match(/\/c\/([a-zA-Z0-9-]+)/);
    if (pathMatch) {
        conversationId = pathMatch[1];
    }

    // Scrape payload from DOM
    const payload: { title: string, messages: any[] } = {
        title: document.title.replace(' - Arena', ''),
        messages: []
    };

    try {
        const proseElements = document.querySelectorAll('.prose');
        if (proseElements && proseElements.length > 0) {
            proseElements.forEach((el, index) => {
                const text = (el as HTMLElement).innerText;
                if (text) {
                    payload.messages.push({
                        role: 'unknown',
                        content: text,
                        timestamp: Date.now() + index
                    });
                }
            });
        }
    } catch (e) {
        logger.error('Arena', 'Scraping failed', e);
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
                    showToast('Arena battle saved!', 'success');
                } else {
                    showToast('Save failed: ' + (saveResponse?.error || 'Unknown error'), 'error');
                }
            });
        } else {
            showToast('Fetch failed. Note: LMSYS Arena sessions are temporary.', 'warning');
        }
    });
}

function showToast(message: string, type: string) {
    if ((window as any).BrainBoxUI) {
        if (!ui) ui = new (window as any).BrainBoxUI();
        ui!.showToast(message, type);
    } else {
        logger.info('Arena', `[Toast] ${message}`);
    }
}
