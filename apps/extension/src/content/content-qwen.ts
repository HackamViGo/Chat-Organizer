// content-qwen.js
(function() {
    const PLATFORM = 'qwen';
    
    chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
        if (request.action === 'triggerSaveChat') {
            handleSave();
        }
    });

    async function handleSave() {
        const url = window.location.href;
        // Qwen uses chat/sessionId OR c/sessionId
        const match = url.match(/\/(?:chat|c)\/([a-zA-Z0-9_-]+)/);
        
        if (!match) {
            showToast('Could not detect Qwen session ID.', 'error');
            return;
        }

        const conversationId = match[1];

        // Scrape payload from DOM
        const payload: { title: string, messages: any[] } = {
            title: document.title.replace(' - Qwen', ''),
            messages: []
        };

        try {
            const main = document.querySelector('main');
            if (main) {
                // Heuristic: Capture all text if we can't find specific bubbles
                // Qwen (as of 2026) likely uses specific classes, but fallback to raw text is safer
                const fullText = (main as HTMLElement).innerText;
                
                if (fullText.trim().length > 0) {
                     payload.messages.push({
                        role: 'assistant', // Default to showing content
                        content: fullText,
                        timestamp: Date.now()
                    });
                }
            }
        } catch (e) {
            console.error('[BrainBox] Qwen scraping failed', e);
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

    let ui: any = null;

    function showToast(message: string, type: string) {
        if ((window as any).BrainBoxUI) {
            if (!ui) ui = new (window as any).BrainBoxUI();
            ui.showToast(message, type);
        } else {
            console.log('[BrainBox]', message);
        }
    }
})();
