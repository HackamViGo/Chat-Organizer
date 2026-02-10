import { logger } from '@/lib/logger';

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
        
        logger.info('TabManager', '📑 Tab listeners registered');
    }

    private handleTabUpdated(
        tabId: number,
        changeInfo: any,
        tab: any
    ) {
        // Only act on complete page loads
        if (changeInfo.status !== 'complete') return;
        if (!tab.url) return;

        // Example: Inject scripts on specific platforms
        if (tab.url.includes('gemini.google.com')) {
            if (this.DEBUG_MODE) {
                logger.debug('TabManager', 'Gemini detected:', tabId);
            }
            // Auto-inject logic here (optional)
        }
    }

    private handleTabActivated(activeInfo: any) {
        // Example: Update badge when switching tabs
        if (this.DEBUG_MODE) {
            logger.debug('TabManager', 'Tab activated:', activeInfo.tabId);
        }
    }

    private handleTabRemoved(tabId: number, removeInfo: any) {
        // Cleanup logic
        if (this.DEBUG_MODE) {
            logger.debug('TabManager', 'Tab closed:', tabId);
        }
    }
}
