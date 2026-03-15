/**
 * Dashboard API Operations
 * Non-platform-specific API handlers (folders, save)
 */

import { logger } from '@/lib/logger'

import { limiters } from '@/lib/rate-limiter.js'

import { CacheManager } from './cacheManager'
import type { Conversation, Message } from './platformAdapters/base'
import { SyncManager } from './syncManager'

import { CONFIG } from '@/lib/config'

// --- Optimized Tag Generation Logic (Whitelist based) ---

interface TagConfig {
  whitelist: Record<string, number>
  regex: RegExp
}

const LANGUAGES: Record<string, TagConfig> = {
  bg: {
    regex: /[а-яА-Я0-9]+/g,
    whitelist: {
      алгоритъм: 1,
      архитектура: 1,
      автоматизация: 1,
      анализ: 1,
      приложение: 1,
      база: 1,
      бизнес: 1,
      бюджет: 1,
      браузър: 1,
      библиотека: 1,
      дизайн: 1,
      домейн: 1,
      договор: 1,
      доклад: 1,
      данни: 1,
      деца: 1,
      диагноза: 1,
      диета: 1,
      екология: 1,
      енергия: 1,
      етика: 1,
      електроника: 1,
      икономика: 1,
      инвестиция: 1,
      интеграция: 1,
      интерфейс: 1,
      информация: 1,
      иновация: 1,
      изкуство: 1,
      изследване: 1,
      курс: 1,
      култура: 1,
      клиент: 1,
      криптиране: 1,
      логика: 1,
      лидерство: 1,
      логистика: 1,
      лекция: 1,
      литература: 1,
      маркетинг: 1,
      мениджмънт: 1,
      математика: 1,
      медицина: 1,
      медия: 1,
      мобилен: 1,
      музика: 1,
      мода: 1,
      наука: 1,
      обучение: 1,
      оптимизация: 1,
      обекти: 1,
      общество: 1,
      образование: 1,
      платформа: 1,
      програма: 1,
      проект: 1,
      процес: 1,
      пазар: 1,
      плащане: 1,
      планиране: 1,
      психология: 1,
      пътуване: 1,
      производство: 1,
      разработка: 1,
      ресурс: 1,
      реклама: 1,
      рецепта: 1,
      рефакторинг: 1,
      роботика: 1,
      сигурност: 1,
      сървър: 1,
      софтуер: 1,
      стратегия: 1,
      спорт: 1,
      система: 1,
      статия: 1,
      социални: 1,
      семейство: 1,
      строителство: 1,
      технология: 1,
      туризъм: 1,
      търговия: 1,
      терапия: 1,
      транспорт: 1,
      уебсайт: 1,
      услуга: 1,
      управление: 1,
      финанси: 1,
      фактура: 1,
      фитнес: 1,
      физика: 1,
      философия: 1,
      филм: 1,
      хардуер: 1,
      хостинг: 1,
      химия: 1,
      хотел: 1,
      цел: 1,
      цена: 1,
    },
  },
  en: {
    regex: /[a-zA-Z0-9]+/g,
    whitelist: {
      algorithm: 1,
      architecture: 1,
      automation: 1,
      analytics: 1,
      application: 1,
      backend: 1,
      frontend: 1,
      database: 1,
      business: 1,
      budget: 1,
      browser: 1,
      library: 1,
      design: 1,
      domain: 1,
      contract: 1,
      report: 1,
      data: 1,
      children: 1,
      diagnosis: 1,
      diet: 1,
      ecology: 1,
      energy: 1,
      ethics: 1,
      electronics: 1,
      economy: 1,
      investment: 1,
      integration: 1,
      interface: 1,
      information: 1,
      innovation: 1,
      art: 1,
      research: 1,
      course: 1,
      culture: 1,
      client: 1,
      encryption: 1,
      logic: 1,
      leadership: 1,
      logistics: 1,
      lecture: 1,
      literature: 1,
      marketing: 1,
      management: 1,
      math: 1,
      medicine: 1,
      media: 1,
      mobile: 1,
      music: 1,
      fashion: 1,
      science: 1,
      training: 1,
      optimization: 1,
      objects: 1,
      society: 1,
      education: 1,
      platform: 1,
      program: 1,
      project: 1,
      process: 1,
      market: 1,
      payment: 1,
      planning: 1,
      psychology: 1,
      travel: 1,
      production: 1,
      development: 1,
      resource: 1,
      advertising: 1,
      recipe: 1,
      refactoring: 1,
      robotics: 1,
      security: 1,
      server: 1,
      software: 1,
      strategy: 1,
      sport: 1,
      system: 1,
      article: 1,
      social: 1,
      family: 1,
      construction: 1,
      technology: 1,
      tourism: 1,
      trading: 1,
      therapy: 1,
      transport: 1,
      website: 1,
      service: 1,
      governance: 1,
      finance: 1,
      invoice: 1,
      fitness: 1,
      physics: 1,
      philosophy: 1,
      movie: 1,
      hardware: 1,
      hosting: 1,
      chemistry: 1,
      hotel: 1,
      goal: 1,
      price: 1,
    },
  },
}

const stemmers = {
  bg: (w: string) => w.replace(/(ите|ове|та|то|те|та|ият|ят|ия|я)$/, '').toLowerCase(),
  en: (w: string) => w.replace(/(ing|ed|ies|s)$/, '').toLowerCase(),
}

/**
 * Основна функция за генериране на тагове
 */
export function getOptimizedTags(messages: Message[]): string[] {
  // Detect language: simple check for Cyrillic
  const hasCyrillic = messages.some((m) => /[а-яА-Я]/.test(m.content))
  const lang = hasCyrillic ? 'bg' : 'en'

  const config = LANGUAGES[lang]
  const stemmer = stemmers[lang]
  const scores: Record<string, { points: number; count: number; original: string }> = {}

  messages.forEach((msg, index) => {
    if (msg.role === 'system') return // Игнориране на системни инструкции

    // Премахване на код блокове (шум)
    const cleanContent = msg.content.replace(/```[\s\S]*?```/g, '')
    const words = cleanContent.match(config.regex)
    if (!words) return

    const isAnchor = index < 2 || index === messages.length - 1
    const multiplier = msg.role === 'user' ? 3 : 1
    const anchorBonus = isAnchor ? 5 : 0

    words.forEach((word) => {
      const lowerWord = word.toLowerCase()
      if (lowerWord.length < 4) return

      const stem = stemmer(lowerWord)

      // O(1) Проверка в Whitelist (търсим или цялата дума, или корена)
      const matchedBase = config.whitelist[lowerWord]
        ? lowerWord
        : config.whitelist[stem]
          ? stem
          : null

      if (matchedBase) {
        if (!scores[matchedBase]) {
          scores[matchedBase] = { points: 0, count: 0, original: lowerWord }
        }
        scores[matchedBase].points += multiplier + anchorBonus
        scores[matchedBase].count += 1
      }
    })
  })

  return Object.values(scores)
    .map((s) => ({
      tag: s.original,
      finalScore: s.points * Math.log1p(s.count), // Normalization
    }))
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, 3)
    .map((s) => s.tag)
}

// --- End Tag Generation Logic ---

const API_BASE_URL = CONFIG.API_BASE_URL
logger.debug('api', `Using API_BASE_URL: ${API_BASE_URL}`)

/**
 * Get user folders from Dashboard (Stale-While-Revalidate)
 */
export async function getUserFolders(silent: boolean = false) {
  // 1. Try to get from cache first
  const cached = await CacheManager.getFolders()

  // 2. Define the background refresh logic
  const fetchFromServer = async () => {
    const { accessToken: encryptedToken } = await chrome.storage.local.get(['accessToken'])
    const accessToken = await decryptToken(encryptedToken)
    if (!accessToken) {
      const { DASHBOARD_URL } = CONFIG
      if (!silent)
        chrome.tabs.create({ url: `${DASHBOARD_URL}/auth/signin?redirect=/extension-auth` })
      throw new Error('No access token')
    }

    const response = await fetch(`${API_BASE_URL}/api/folders`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Extension-Key': CONFIG.EXTENSION_KEY,
      },
    })

    if (!response.ok) {
      if (response.status === 401) throw new Error('Unauthorized')
      throw new Error('Failed to fetch folders')
    }

    const data = await response.json()
    const folders = data.folders || []
    await CacheManager.setFolders(folders)
    return folders
  }

  // 3. Return cached data immediately if available, then refresh in background
  if (cached) {
    fetchFromServer().catch((err) => logger.warn('api', 'Background folder refresh failed', err))
    return cached
  }

  // 4. If no cache, wait for the first fetch
  return await fetchFromServer()
}

/**
 * Get user settings from Dashboard (Stale-While-Revalidate)
 */
export async function getUserSettings() {
  // 1. Try cache
  const cached = await CacheManager.getSettings()

  const fetchFromServer = async () => {
    const { accessToken: encryptedToken } = await chrome.storage.local.get(['accessToken'])
    const accessToken = await decryptToken(encryptedToken)
    if (!accessToken) return { quickAccessFolders: [] }

    const response = await fetch(`${API_BASE_URL}/api/user/settings`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Extension-Key': CONFIG.EXTENSION_KEY,
      },
    })

    if (!response.ok) return { quickAccessFolders: [] }

    const data = await response.json()
    const settings = data.settings || { quickAccessFolders: [] }
    await CacheManager.setSettings(settings)
    return settings
  }

  if (cached) {
    fetchFromServer().catch((err) => logger.warn('api', 'Background settings refresh failed', err))
    return cached
  }

  return await fetchFromServer()
}

import { decryptToken } from '@/lib/crypto'

/**
 * Save conversation to Dashboard
 */
export async function saveToDashboard(
  conversationData: Conversation,
  folderId: string | null,
  silent: boolean
) {
  const { accessToken: encryptedToken, expiresAt } = await chrome.storage.local.get([
    'accessToken',
    'expiresAt',
  ])
  const accessToken = await decryptToken(encryptedToken)

  const isTokenValid = accessToken && (!expiresAt || expiresAt > Date.now())

  if (!isTokenValid) {
    logger.warn('api', 'Invalid or expired token', { hasToken: !!accessToken, expiresAt })
    if (!silent) {
      const { DASHBOARD_URL } = CONFIG
      chrome.tabs.create({ url: `${DASHBOARD_URL}/auth/signin?redirect=/extension-auth` })
    }
    throw new Error('Please authenticate first')
  }

  logger.debug('api', `Saving chat to ${API_BASE_URL}/api/chats...`)
  logger.debug('api', 'Token check', {
    hasToken: !!accessToken,
    tokenStart: accessToken ? accessToken.substring(0, 10) + '...' : 'N/A',
    expiresAt: expiresAt ? new Date(expiresAt).toISOString() : 'Never',
    now: new Date().toISOString(),
  })

  return await limiters.dashboard.schedule(async () => {
    const formattedContent = formatMessagesAsText(conversationData)
    const chatUrl =
      conversationData.url || `https://${conversationData.platform}/${conversationData.id}`
    const localTags = getOptimizedTags(conversationData.messages || [])

    const requestBody = {
      title: conversationData.title || 'Untitled Chat',
      content: formattedContent,
      messages: conversationData.messages || [],
      platform: conversationData.platform,
      url: chatUrl,
      folder_id: folderId || null,
      tags: localTags,
    }

    // 1. Check if we should even try (offline check)
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      logger.debug('api', 'Offline detected. Queuing chat.')
      await SyncManager.addToQueue('chat', { ...requestBody, folderId }) // folderId included for context
      throw new Error('Offline: Saved to sync queue')
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'X-Extension-Key': CONFIG.EXTENSION_KEY,
        },
        body: JSON.stringify(requestBody),
      })

      if (response.status === 401) {
        await chrome.storage.local.remove(['accessToken'])
        if (!silent)
          chrome.tabs.create({ url: `${API_BASE_URL}/auth/signin?redirect=/extension-auth` })
        throw new Error('Session expired')
      }

      if (!response.ok) {
        const errorText = await response.text()
        // Queue on generic server errors (5xx)
        if (response.status >= 500) {
          logger.warn('api', 'Server error. Queuing for retry.')
          await SyncManager.addToQueue('chat', { ...requestBody, folderId })
        }
        throw new Error(errorText)
      }

      const result = await response.json()
      logger.debug('api', 'Save successful', result)

      // 🚀 Trigger background sync of any previously queued items
      SyncManager.processQueue(async (item) => {
        try {
          const syncResponse = await fetch(`${API_BASE_URL}/api/chats`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
              'X-Extension-Key': CONFIG.EXTENSION_KEY,
            },
            body: JSON.stringify(item.data),
          })
          return syncResponse.ok
        } catch {
          return false
        }
      }).catch((err) => logger.error('api', 'Queue processing failed', err))

      return result
    } catch (error: any) {
      // Queue on network errors (fetch failed)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        logger.warn('api', 'Network error. Queuing chat.')
        await SyncManager.addToQueue('chat', { ...requestBody, folderId })
        throw new Error('Network error: Saved to sync queue')
      }
      throw error
    }
  })
}

/**
 * Format messages as text for storage
 */
function formatMessagesAsText(conversationData: Conversation): string {
  if (!conversationData.messages?.length) return 'No messages'
  return conversationData.messages
    .map((m) => `[${m.role?.toUpperCase()}]: ${m.content}`)
    .join('\n\n')
}

/**
 * Enhance prompt using Gemini API
 */
export async function enhancePrompt(promptText: string) {
  const { accessToken: encryptedToken } = await chrome.storage.local.get(['accessToken'])
  const accessToken = await decryptToken(encryptedToken)

  // We don't strictly require login for enhancement if GEMINI_API_KEY is configured on server
  // but we use the token to identify the user if possible.

  const response = await fetch(`${API_BASE_URL}/api/ai/enhance-prompt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: accessToken ? `Bearer ${accessToken}` : '',
      'X-Extension-Key': CONFIG.EXTENSION_KEY,
    },
    body: JSON.stringify({ prompt: promptText }),
  })

  if (!response.ok) {
    throw new Error('Failed to enhance prompt')
  }

  const data = await response.json()
  return data.enhancedPrompt
}

/**
 * Create a new prompt in Dashboard
 */
export async function createPrompt(promptData: any) {
  const { accessToken: encryptedToken } = await chrome.storage.local.get(['accessToken'])
  const accessToken = await decryptToken(encryptedToken)

  if (!accessToken) throw new Error('Unauthorized')

  const response = await fetch(`${API_BASE_URL}/api/prompts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Extension-Key': CONFIG.EXTENSION_KEY,
    },
    body: JSON.stringify(promptData),
  })

  if (!response.ok) {
    throw new Error('Failed to create prompt')
  }

  return await response.json()
}
