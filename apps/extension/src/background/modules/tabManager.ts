/**
 * TabManager
 * 
 * Manages tab lifecycle and platform detection
 */
export class TabManager {
    private DEBUG_MODE: boolean;

    constructor(debug = false) {
        this.DEBUG_MODE = debug;
        
        this.handleTabUpdated = this.handleTabUpdated.bind(this);
        this.handleTabActivated = this.handleTabActivated.bind(this);
        this.handleTabRemoved = this.handleTabRemoved.bind(this);
    }

    initialize() {
        chrome.tabs.onUpdated.addListener(this.handleTabUpdated);
        chrome.tabs.onActivated.addListener(this.handleTabActivated);
        chrome.tabs.onRemoved.addListener(this.handleTabRemoved);
        
        console.log('[TabManager] 📑 Tab listeners registered');
    }

    private handleTabUpdated(
        tabId: number,
        changeInfo: chrome.tabs.TabChangeInfo,
        tab: chrome.tabs.Tab
    ) {
        // Only act on complete page loads
        if (changeInfo.status !== 'complete') return;
        if (!tab.url) return;

        // Example: Inject scripts on specific platforms
        if (tab.url.includes('gemini.google.com')) {
            if (this.DEBUG_MODE) {
                console.log('[TabManager] Gemini detected:', tabId);
            }
            // Auto-inject logic here (optional)
        }
    }

    private handleTabActivated(activeInfo: chrome.tabs.TabActiveInfo) {
        // Example: Update badge when switching tabs
        if (this.DEBUG_MODE) {
            console.log('[TabManager] Tab activated:', activeInfo.tabId);
        }
    }

    private handleTabRemoved(tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) {
        // Cleanup logic
        if (this.DEBUG_MODE) {
            console.log('[TabManager] Tab closed:', tabId);
        }
    }
}
