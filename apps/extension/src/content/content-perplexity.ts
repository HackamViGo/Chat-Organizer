// BrainBox - Perplexity Content Script
import { logger } from '../lib/logger';
import { BrainBoxUI } from '../lib/ui';

const PLATFORM = 'perplexity';
let ui: BrainBoxUI | null = null;

chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
    if (request.action === 'triggerSaveChat') {
        handleSave();
    }
});

async function handleSave() {
    const url = window.location.href;
    // Perplexity uses search/slug or search?q=...
    // We'll try to extract the slug from /search/[slug]
    const match = url.match(/\/search\/([a-zA-Z0-9_-]+)/);
    
    if (!match) {
        // Check if it's in the query param or if we can get it from the page
        showToast('Please open a specific thread to save.', 'info');
        return;
    }

    const conversationId = match[1];

    // Scrape the DOM for messages as fallback
    const payload: { title: string, messages: any[] } = {
        title: document.title.replace(' | Perplexity', ''),
        messages: []
    };

    try {
        // Perplexity structure usually involves user and assistant divs
        // We look for common patterns like 'search-query-header' or 'prose'
        
        // Note: Selectors here are best-effort standard selectors for Perplexity's UI
        // Attempts to find Q&A pairs
        
        const mainContainer = document.querySelector('main');
        if (mainContainer) {
            // Heuristic: Find all blocks that look like message text
            // User queries are often in h1 or specific divs
            // Assistant answers are in .prose
            
            // Method 1: Iterating through thread elements (if identifiable)
            // This is hard without stable classes.
            
            // Method 2: Capture all text in order (simplified)
            const proseElements = document.querySelectorAll('.prose'); // Assistant
            const queryElements = document.querySelectorAll('.font-display'); // User (headings)

            // This is naive; they might not be interleaved perfectly in DOM order queryAll returns
            // Better approach: Walk the tree or use specific stable attributes if known.
            // For now, let's try to just capture the main answer if it's a single search result
            // or try to build a conversation if feasible.
            
            // Let's iterate over ALL children of the result container to preserve order
            
            // Fallback: If we can't parse perfectly, at least get the main answer
            if (proseElements.length > 0) {
                // Try to map queries to answers
                // Usually strict alternation: Query -> Answer -> Followup -> Answer
                
                // Let's try to grab all "user" and "assistant" blocks by some heuristic
                // User: often has 'break-words' or is a heading
                // Assistant: class 'prose'
                
                // Simple extraction for now:
                // 1. Get the main query (h1 usually)
                const titleEl = document.querySelector('h1');
                if (titleEl) {
                    payload.messages.push({
                        role: 'user',
                        content: titleEl.textContent || '',
                        timestamp: Date.now()
                    });
                }
                
                // 2. Get the main answer (first .prose)
                const answerEl = document.querySelector('.prose');
                if (answerEl) {
                    payload.messages.push({
                        role: 'assistant',
                        content: (answerEl as HTMLElement).innerText, // innerText preserves newlines better
                        timestamp: Date.now()
                    });
                }
                
                // 3. Look for follow-ups (subsequent Q&A)
                // This requires more complex DOM traversal not safe to hardcode blindly
            }
        } else {
            logger.warn('Perplexity', 'Could not find main container for scraping');
        }
    } catch (e) {
        logger.error('Perplexity', 'Scraping failed', e);
    }

    chrome.runtime.sendMessage({
        action: 'getConversation',
        platform: PLATFORM,
        conversationId,
        url,
        payload // Send scraped data
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
            showToast('Fetch failed: ' + (response?.error || 'Could not retrieve thread'), 'error');
        }
    });
}

function showToast(message: string, type: string) {
    if ((window as any).BrainBoxUI) {
        if (!ui) ui = new (window as any).BrainBoxUI();
        ui!.showToast(message, type);
    } else {
        logger.info('Perplexity', `[Toast] ${message}`);
    }
}
