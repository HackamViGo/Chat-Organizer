/// <reference types="chrome"/>

import { useState, useEffect } from 'react'

import { logger } from '../../lib/logger'

import { useStorage } from './useStorage'

export function useAuth() {
  const [isConnected, setIsConnected] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const storage = useStorage(['accessToken', 'userEmail'])

  useEffect(() => {
    const connected = !!storage.accessToken
    setIsConnected(connected)
    setUserEmail(storage.userEmail || null)
    logger.debug('popup', 'Auth status', { connected, email: storage.userEmail })
  }, [storage.accessToken, storage.userEmail])

  const sync = async () => {
    try {
      logger.debug('popup', 'Syncing all tokens and status...')
      const response = await chrome.runtime.sendMessage({ action: 'syncAll' })
      logger.debug('popup', 'Sync response', response)

      if (response?.success && response?.isValid) {
        // Reload fresh storage data
        const freshStorage = await chrome.storage.local.get(['accessToken', 'userEmail'])
        setIsConnected(true)
        setUserEmail(freshStorage.userEmail || null)
        logger.debug('popup', 'Sync successful, connected')
      } else {
        setIsConnected(false)
        logger.debug('popup', 'Sync failed or session invalid')
      }
    } catch (error) {
      logger.error('popup', 'Sync error', error)
      setIsConnected(false)
    }
  }

  const logout = async () => {
    logger.debug('popup', 'Logging out...')
    await chrome.storage.local.remove(['accessToken', 'refreshToken', 'userEmail', 'expiresAt'])
    setIsConnected(false)
    setUserEmail(null)
  }

  return { isConnected, userEmail, sync, logout }
}
