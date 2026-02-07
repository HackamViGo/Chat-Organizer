import { logger } from '@/lib/logger';

export class InstallationManager {
    private DEBUG_MODE: boolean;

    constructor(debug = false) {
        this.DEBUG_MODE = debug;
        this.handleInstalled = this.handleInstalled.bind(this);
    }

    initialize() {
        chrome.runtime.onInstalled.addListener(this.handleInstalled);
        logger.info('InstallationManager', '🎬 Listening for lifecycle events...');
    }

    private handleInstalled(details: chrome.runtime.InstalledDetails) {
        if (this.DEBUG_MODE) {
            logger.debug('InstallationManager', 'Event:', details.reason);
        }

        switch (details.reason) {
            case 'install':
                this.onFirstInstall();
                break;
            
            case 'update':
                this.onUpdate(details.previousVersion);
                break;
            
            case 'chrome_update':
            case 'shared_module_update':
                // Ignore browser updates
                break;
        }
    }

    private onFirstInstall() {
        logger.info('InstallationManager', '🎉 First install detected');
        
        // Open welcome page
        chrome.tabs.create({ 
            url: chrome.runtime.getURL('welcome.html') 
        });
    }

    private onUpdate(previousVersion?: string) {
        logger.info('InstallationManager', `🔄 Updated from: ${previousVersion}`);
        
        // Migration logic here
        // Example: Clean up old storage keys
        // chrome.storage.local.remove(['deprecated_key']);
    }
}
