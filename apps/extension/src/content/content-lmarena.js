// content-lmarena.js
(function() {
    const PLATFORM = 'lmarena';
    
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
        // Arena.ai uses .prose classes for messages
        const payload = {
            title: document.title.replace(' - Arena', ''),
            messages: []
        };

        try {
            const proseElements = document.querySelectorAll('.prose');
            if (proseElements && proseElements.length > 0) {
                proseElements.forEach((el, index) => {
                    // Try to infer role based on position or checking styling classes if available.
                    // Arena usually alternates User -> Model A -> Model B (if side by side) or User -> Model.
                    // A simple heuristic for single model chat: Even = User, Odd = Model.
                    // But standard Arena is User (0) -> Model A (1) / Model B (2). 
                    // This is tricky without more context.
                    // However, usually "User" text is not in .prose, only the content is.
                    // Let's assume standard chat flow for now or label generically.
                    
                    // Better Heuristic: Check for "User" label nearby?
                    // For now, let's just dump them in order.
                    
                    let role = 'assistant';
                    // Check if parent or nearby element indicates user. 
                    // Often user messages are right-aligned or have different container.
                    // If we can't tell, default to assistant or alternate.
                     
                    // Alternative: Just capture the text.
                    const text = el.innerText;
                    if (text) {
                         payload.messages.push({
                            id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now().toString(),
                            role: 'assistant', // generic role, let UI handle or assume alternating
                            content: text,
                            timestamp: Date.now() + index // increment to keep order
                        });
                    }
                });
            }
        } catch (e) {
            console.error('[BrainBox] Arena scraping failed', e);
        }

        chrome.runtime.sendMessage({
            action: 'getConversation',
            platform: PLATFORM,
            conversationId,
            url,
            payload
        }, (response) => {
            if (response && response.success) {
                chrome.runtime.sendMessage({
                    action: 'saveToDashboard',
                    data: response.data,
                    folderId: null,
                    silent: false
                }, (saveResponse) => {
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

    let ui = null;

    function showToast(message, type) {
        if (window.BrainBoxUI) {
            if (!ui) ui = new window.BrainBoxUI();
            ui.showToast(message, type);
        } else {
            console.log('[BrainBox]', message);
        }
    }
})();
