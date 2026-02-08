/// <reference types="chrome"/>

import { useState, useEffect } from 'react';
import { useStorage } from './useStorage';
import { logger } from '@/lib/logger';

export function useAuth() {
  const [isConnected, setIsConnected] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  const storage = useStorage(['accessToken', 'userEmail']);

  useEffect(() => {
    const connected = !!storage.accessToken;
    setIsConnected(connected);
    setUserEmail(storage.userEmail || null);
    logger.debug('Popup useAuth', 'Status:', { connected, email: storage.userEmail });
  }, [storage.accessToken, storage.userEmail]);

  const sync = async () => {
    try {
      logger.debug('Popup useAuth', 'Syncing all tokens and status...');
      const response = await chrome.runtime.sendMessage({ action: 'syncAll' });
      logger.debug('Popup useAuth', 'Sync response:', response);
      
      if (response?.success && response?.isValid) {
        // Reload fresh storage data
        const freshStorage = await chrome.storage.local.get(['accessToken', 'userEmail']);
        setIsConnected(true);
        setUserEmail(freshStorage.userEmail || null);
        logger.debug('Popup useAuth', 'Sync successful, connected');
      } else {
        setIsConnected(false);
        logger.debug('Popup useAuth', 'Sync failed or session invalid');
      }
    } catch (error) {
      logger.error('Popup useAuth', 'Sync error:', error);
      setIsConnected(false);
    }
  };

  const logout = async () => {
    logger.debug('Popup useAuth', 'Logging out...');
    await chrome.storage.local.remove(['accessToken', 'refreshToken', 'userEmail', 'expiresAt']);
    setIsConnected(false);
    setUserEmail(null);
  };

  return { isConnected, userEmail, sync, logout };
}
