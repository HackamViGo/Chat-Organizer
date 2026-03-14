import { logger } from '../shared/logger';

export const NotificationManager = {
  showBadge(text: string, color: string = '#4F46E5'): void {
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color });

    // Auto-hide after 5 seconds
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 5000);
  },

  showToast(title: string, message: string, type: 'basic' = 'basic') {
    chrome.notifications.create({
      type,
      iconUrl: 'icons/icon128.png',
      title,
      message,
    });
  },

  async notifySaveSuccess(): Promise<void> {
    this.showBadge('OK', '#10B981');
    this.showToast('BrainBox 🎉', 'Conversation saved successfully to Dashboard!');
    logger.info('Save notification shown');
  },

  async notifySaveError(): Promise<void> {
    this.showBadge('ERR', '#EF4444');
    this.showToast('BrainBox ❌', 'Failed to save conversation.');
    logger.error('Error notification shown');
  },

  async notifyQueued(): Promise<void> {
    this.showBadge('WAIT', '#F59E0B');
    this.showToast('BrainBox ⏳', 'Not logged in or offline. Save queued.');
    logger.info('Queued notification shown');
  }
};
