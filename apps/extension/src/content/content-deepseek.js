// content-deepseek.js
(function() {
    const PLATFORM = 'deepseek';
    
    // Listen for save command from context menu
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
        const payload = {
            title: document.title.replace(' - DeepSeek', ''),
            messages: []
        };

        try {
            // DeepSeek specific classes (often .ds-markdown or similar)
            // But let's be broad first.
            const main = document.querySelector('.chat-container') || document.querySelector('main') || document.body;
            
            if (main) {
                // Try to find message bubbles if possible
                const messageElements = main.querySelectorAll('.message-content, .ds-markdown, .text-content');
                
                if (messageElements.length > 0) {
                    messageElements.forEach((el, index) => {
                         payload.messages.push({
                            id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now().toString(),
                            role: 'assistant',
                            content: el.innerText,
                            timestamp: Date.now() + index
                        });
                    });
                } else {
                    // Fallback to full text
                    const fullText = main.innerText;
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
            console.error('[BrainBox] DeepSeek scraping failed', e);
        }

        // Send to background to fetch full conversation data
        chrome.runtime.sendMessage({
            action: 'getConversation',
            platform: PLATFORM,
            conversationId,
            url,
            payload
        }, (response) => {
            if (response && response.success) {
                // Save to dashboard
                chrome.runtime.sendMessage({
                    action: 'saveToDashboard',
                    data: response.data,
                    folderId: null,
                    silent: false
                }, (saveResponse) => {
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

    let ui = null;

    function showToast(message, type) {
        if (window.BrainBoxUI) {
            if (!ui) ui = new window.BrainBoxUI();
            ui.showToast(message, type);
        } else {
            console.log('[BrainBox]', message);
            alert(message); // Fallback if UI not loaded
        }
    }
})();
