// BrainBox - Popup Script

// Function to update status indicators
async function updateStatusIndicators() {
    // Check token status for all platforms
    const { 
        chatgpt_token, 
        gemini_at_token, 
        gemini_dynamic_key,
        claude_org_id,
        accessToken 
    } = await chrome.storage.local.get([
        'chatgpt_token',
        'gemini_at_token',
        'gemini_dynamic_key',
        'claude_org_id',
        'accessToken'
    ]);

    // Check if user is logged into dashboard (required for all platforms)
    const hasDashboardAccess = !!accessToken;

    // Update status indicators - green only if platform token AND dashboard access are ready
    // ChatGPT: needs chatgpt_token + accessToken
    const chatgptReady = chatgpt_token && hasDashboardAccess;
    document.getElementById('chatgpt-status').textContent = chatgptReady ? '🟢' : '⚪';
    
    // Gemini: needs gemini_at_token + gemini_dynamic_key + accessToken
    const geminiReady = gemini_at_token && gemini_dynamic_key && hasDashboardAccess;
    document.getElementById('gemini-status').textContent = geminiReady ? '🟢' : '⚪';
    
    // Claude: needs claude_org_id + accessToken (cookies are handled automatically)
    const claudeReady = claude_org_id && hasDashboardAccess;
    document.getElementById('claude-status').textContent = claudeReady ? '🟢' : '⚪';
}

document.addEventListener('DOMContentLoaded', async () => {
    // Initial status update
    await updateStatusIndicators();

    // Refresh button
    const refreshBtn = document.getElementById('refresh-status');
    refreshBtn.addEventListener('click', async () => {
        // Add loading state
        refreshBtn.classList.add('loading');
        refreshBtn.textContent = '⏳';
        
        // Small delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Update status
        await updateStatusIndicators();
        
        // Remove loading state
        refreshBtn.classList.remove('loading');
        refreshBtn.textContent = '🔄';
    });

    // Open dashboard button
    document.getElementById('open-dashboard').addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://brainbox-alpha.vercel.app' });
    });

    // Batch images toggle button
    let batchModeActive = false;
    const batchBtn = document.getElementById('toggle-batch-images');
    const batchIcon = document.getElementById('batch-images-icon');
    const batchText = document.getElementById('batch-images-text');
    
    batchBtn.addEventListener('click', async () => {
        console.log('[🖼️ Popup] Batch button clicked, current state:', batchModeActive);
        batchModeActive = !batchModeActive;
        console.log('[🖼️ Popup] New batch mode state:', batchModeActive);
        
        // Update button appearance
        if (batchModeActive) {
            batchBtn.style.background = 'rgba(16, 185, 129, 0.3)';
            batchIcon.textContent = '✅';
            batchText.textContent = 'Batch Mode ON';
        } else {
            batchBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            batchIcon.textContent = '📸';
            batchText.textContent = 'Batch Save Images';
        }
        
        // Get current active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        console.log('[🖼️ Popup] Active tab:', tab?.id, tab?.url);
        
        if (!tab) {
            console.error('[🖼️ Popup] ❌ No active tab found');
            return;
        }
        
        // Send message to content script
        try {
            console.log('[🖼️ Popup] 📨 Sending toggleBatchMode message to tab:', tab.id);
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'toggleBatchMode',
                enabled: batchModeActive
            });
            console.log('[🖼️ Popup] ✅ Message sent successfully, response:', response);
        } catch (error) {
            console.log('[🖼️ Popup] ⚠️ Content script not ready, error:', error.message);
            console.log('[🖼️ Popup] 🔧 Attempting to inject image-saver script...');
            
            // Content script might not be loaded, try to inject it
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['image-saver/image-saver.js']
                });
                console.log('[🖼️ Popup] ✅ Image saver script injected');
                
                setTimeout(async () => {
                    try {
                        console.log('[🖼️ Popup] 📨 Retrying message after injection...');
                        const response = await chrome.tabs.sendMessage(tab.id, {
                            action: 'toggleBatchMode',
                            enabled: batchModeActive
                        });
                        console.log('[🖼️ Popup] ✅ Message sent after injection, response:', response);
                    } catch (e) {
                        console.error('[🖼️ Popup] ❌ Failed to toggle batch mode after injection:', e);
                        console.error('[🖼️ Popup] Error details:', {
                            message: e.message,
                            stack: e.stack
                        });
                    }
                }, 500);
            } catch (injectError) {
                console.error('[🖼️ Popup] ❌ Failed to inject image saver script:', injectError);
                console.error('[🖼️ Popup] Inject error details:', {
                    message: injectError.message,
                    stack: injectError.stack
                });
            }
        }
    });

    // View docs button
    document.getElementById('view-docs').addEventListener('click', () => {
        chrome.tabs.create({
            url: 'https://github.com/yourusername/brainbox-extension/blob/main/README.md'
        });
    });
});
