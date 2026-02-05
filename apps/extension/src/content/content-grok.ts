// content-grok.js
(function() {
    const PLATFORM = 'grok';
    
    chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
        if (request.action === 'triggerSaveChat') {
            handleSave();
        }
    });

    let ui: any = null;

    function showToast(message: string, type: string) {
        if ((window as any).BrainBoxUI) {
            if (!ui) ui = new (window as any).BrainBoxUI();
            ui.showToast(message, type);
        } else {
            console.log('[BrainBox]', message);
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
            // UUID support (including hyphens)
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
                // Best-effort text extraction
                // Since Grok class names are obfuscated, we capture the raw text
                // formatting it as a single block if we can't separate it easily.
                
                // Try to split by obvious visual breaks if possible, otherwise plain text.
                const fullText = (mainContainer as HTMLElement).innerText;
                
                if (fullText.trim().length > 0) {
                    payload.messages.push({
                        role: 'assistant', // Default to assistant to show full context
                        content: fullText,
                        timestamp: Date.now()
                    });
                }
            }
        } catch (e) {
            console.error('[BrainBox] Grok scraping failed', e);
        }

        chrome.runtime.sendMessage({
            action: 'getConversation',
            platform: PLATFORM,
            conversationId,
            url,
            payload // Send proper payload
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
                // If scraping worked but fetch failed (and adapter didn't use payload for some reason),
                // we might still get here if payload was empty.
                showToast('Fetch failed: ' + (response?.error || 'Could not retrieve chat'), 'error');
            }
        });
    }
})();
