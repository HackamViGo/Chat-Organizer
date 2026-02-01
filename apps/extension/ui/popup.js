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
    document.getElementById('dashboard-status').textContent = hasDashboardAccess ? '🟢' : '⚪';

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
        const url = window.BRAINBOX_CONFIG ? window.BRAINBOX_CONFIG.DASHBOARD_URL : 'https://brainbox-alpha.vercel.app';
        chrome.tabs.create({ url });
    });

    // View docs button
    document.getElementById('view-docs').addEventListener('click', () => {
        chrome.tabs.create({
            url: (window.BRAINBOX_CONFIG ? window.BRAINBOX_CONFIG.DASHBOARD_URL : 'https://brainbox-alpha.vercel.app') + '/docs'
        });
    });
});
