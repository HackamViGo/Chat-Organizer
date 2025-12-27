// BrainBox - Popup Script

document.addEventListener('DOMContentLoaded', async () => {

    // Check token status
    const { chatgpt_token, gemini_at_token, gemini_dynamic_key } =
        await chrome.storage.local.get([
            'chatgpt_token',
            'gemini_at_token',
            'gemini_dynamic_key'
        ]);

    // Update status indicators
    document.getElementById('chatgpt-status').textContent = chatgpt_token ? '🟢' : '⚪';
    document.getElementById('gemini-status').textContent =
        (gemini_at_token && gemini_dynamic_key) ? '🟢' : '⚪';
    document.getElementById('claude-status').textContent = '🟡'; // Cookie-based, always ready

    // Open dashboard button
    document.getElementById('open-dashboard').addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://brainbox-alpha.vercel.app' });
    });

    // View docs button
    document.getElementById('view-docs').addEventListener('click', () => {
        chrome.tabs.create({
            url: 'https://github.com/yourusername/brainbox-extension/blob/main/README.md'
        });
    });

});
