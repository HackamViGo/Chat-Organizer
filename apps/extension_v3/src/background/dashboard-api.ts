import { CONFIG } from '../shared/config';
import { Storage } from '../shared/storage';
import type { DashboardPayload } from '../shared/types';
import { SyncQueue } from './sync-queue';

const DASHBOARD_BASE_URL = CONFIG.DASHBOARD_URL;

export const DashboardAPI = {
  async saveConversation(
    payload: DashboardPayload,
    folderId: string | null,
    authToken: string
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const response = await fetch(`${DASHBOARD_BASE_URL}/api/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          ...payload,
          folderId
        })
      });

      if (!response.ok) {
        // Ако сме offline или сървърът е down — добави в queue
        if (response.status >= 500) {
          await SyncQueue.add(payload, folderId);
          return { success: false, error: 'Queued for retry (server error)' };
        }
        const errorText = await response.text();
        return { success: false, error: errorText };
      }

      const result = await response.json();
      return { success: true, id: result.id };
    } catch {
      // Network error — queue за по-късно
      await SyncQueue.add(payload, folderId);
      return { success: false, error: 'Queued for retry (offline)' };
    }
  },

  async getUserAuthToken(retries = 3): Promise<string | null> {
    for (let i = 0; i < retries; i++) {
      const token = await Storage.get<string>('dashboardAuthToken');
      if (token) return token;
      if (i < retries - 1) await new Promise(r => setTimeout(r, 1000));
    }
    return null;
  }
};
