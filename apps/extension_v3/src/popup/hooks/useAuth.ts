/// <reference types="chrome"/>

import { useState, useEffect } from 'react'

import { logger } from '../../shared/logger'

import { useStorage } from './useStorage'

interface AuthStorage {
  [key: string]: unknown;
  dashboardAuthToken: string;
  userEmail: string;
}

export function useAuth() {
  const [isConnected, setIsConnected] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const storage = useStorage<AuthStorage>(['dashboardAuthToken', 'userEmail'])

  useEffect(() => {
    const connected = !!storage.dashboardAuthToken
    setIsConnected(connected)
    setUserEmail(storage.userEmail || null)
    logger.debug('popup', 'Auth status', { connected, email: storage.userEmail })
  }, [storage.dashboardAuthToken, storage.userEmail])

  const sync = async () => {
    try {
      logger.debug('popup', 'Syncing auth status...')
      const response = await chrome.runtime.sendMessage({ action: 'getAuthStatus' })
      logger.debug('popup', 'Auth status response', response)

      if (response?.authenticated) {
        // Reload fresh storage data
        const freshStorage = await chrome.storage.local.get(['dashboardAuthToken', 'userEmail']) as Partial<AuthStorage>
        setIsConnected(true)
        setUserEmail(freshStorage.userEmail || null)
        logger.debug('popup', 'Auth check successful, connected')
      } else {
        setIsConnected(false)
        logger.debug('popup', 'Auth check failed or session invalid')
      }
    } catch (error) {
      logger.error('popup', 'Auth check error', error)
      setIsConnected(false)
    }
  }

  const logout = async () => {
    logger.debug('popup', 'Logging out...')
    await chrome.storage.local.remove(['dashboardAuthToken', 'refreshToken', 'userEmail', 'expiresAt'])
    setIsConnected(false)
    setUserEmail(null)
  }

  return { isConnected, userEmail, sync, logout }
}
