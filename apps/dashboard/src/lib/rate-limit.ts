import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * createRateLimiter — Factory for Upstash Rate Limiters with a safety fallback.
 * If Redis credentials are missing, it returns null instead of crashing the app.
 */
function createRateLimiter(windowRequests: number, windowSeconds: string, prefix: string) {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(`[rate-limit] WARNING: ${prefix} rate limiting is DISABLED — missing Upstash credentials`)
    }
    return null
  }

  try {
    const redis = new Redis({
      url,
      token,
    })

    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(windowRequests, windowSeconds as any),
      analytics: true,
      prefix: `brainbox:${prefix}`,
    })
  } catch (error) {
    console.error(`[rate-limit] FAILED to initialize ${prefix} rate limiter:`, error)
    return null
  }
}

// AI Endpoints: 5 requests per minute
export const aiRateLimit = createRateLimiter(5, '1 m', 'ai')

// Extension Sync: 30 requests per minute
export const syncRateLimit = createRateLimiter(30, '1 m', 'sync')
