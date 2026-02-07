// BrainBox - DeepSeek Content Script
import { logger } from '../lib/logger';
import { BrainBoxUI } from '../lib/ui';

const PLATFORM = 'deepseek';
let ui: BrainBoxUI | null = null;

// Listen for save command from context menu
chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
    if (request.action === 'triggerSaveChat') {
        handleSave();
    }
});

async function handleSave() {
    // Extract conversation ID from URL
    const url = window.location.href;
    const match = url.match(/\/chat\/([a-zA-Z0-9_-]+)/);
    
    if (!match) {
        showToast('Could not detect conversation ID. Make sure you are in a chat.', 'error');
        return;
    }

    const conversationId = match[1];

    // Scrape payload from DOM
    const payload: { title: string, messages: any[] } = {
        title: document.title.replace(' - DeepSeek', ''),
        messages: []
    };

    try {
        // DeepSeek specific classes (often .ds-markdown or similar)
        const main = document.querySelector('.chat-container') || document.querySelector('main') || document.body;
        
        if (main) {
            // Try to find message bubbles if possible
            const messageElements = main.querySelectorAll('.message-content, .ds-markdown, .text-content');
            
            if (messageElements.length > 0) {
                messageElements.forEach((el, index) => {
                      payload.messages.push({
                        role: 'unknown',
                        content: (el as HTMLElement).innerText,
                        timestamp: Date.now() + index
                    });
                });
            } else {
                // Fallback to full text
                const fullText = (main as HTMLElement).innerText;
                if (fullText.trim().length > 0) {
                    payload.messages.push({
                        role: 'assistant',
                        content: fullText,
                        timestamp: Date.now()
                    });
                }
            }
        }
    } catch (e) {
        logger.error('DeepSeek', 'Scraping failed', e);
    }

    // Send to background to fetch full conversation data
    chrome.runtime.sendMessage({
        action: 'getConversation',
        platform: PLATFORM,
        conversationId,
        url,
        payload
    }, (response: any) => {
        if (response && response.success) {
            // Save to dashboard
            chrome.runtime.sendMessage({
                action: 'saveToDashboard',
                data: response.data,
                folderId: null,
                silent: false
            }, (saveResponse: any) => {
                if (saveResponse && saveResponse.success) {
                    showToast('Chat saved successfully!', 'success');
                } else {
                    showToast('Save failed: ' + (saveResponse?.error || 'Unknown error'), 'error');
                }
            });
        } else {
            showToast('Fetch failed: ' + (response?.error || 'Could not retrieve chat data'), 'error');
        }
    });
}

function showToast(message: string, type: string) {
    if ((window as any).BrainBoxUI) {
        if (!ui) ui = new (window as any).BrainBoxUI();
        ui!.showToast(message, type);
    } else {
        logger.info('DeepSeek', `[Toast] ${message}`);
        alert(message); // Fallback if UI not loaded
    }
}
