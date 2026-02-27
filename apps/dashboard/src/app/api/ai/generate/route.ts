import { analyzeChatContent } from '@brainbox/shared'
import { aiGenerateRequestSchema } from '@brainbox/validation'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { logger } from '@/lib/logger'
import { aiRateLimit } from '@/lib/rate-limit'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * AI Generate API endpoint
 * Follows Google Cloud best practices for API key usage
 * @see https://docs.cloud.google.com/docs/authentication/api-keys-use#node.js
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { content, apiKey } = aiGenerateRequestSchema.parse(body)

    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // S4-3: Rate Limiting
    if (aiRateLimit) {
      const { success } = await aiRateLimit.limit(user.id)
      if (!success) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
      }
    }

    const apiKeyToUse = apiKey || process.env.GEMINI_API_KEY

    if (!apiKeyToUse) {
      return NextResponse.json(
        {
          error: 'API Key Required',
          message:
            'GEMINI_API_KEY not configured. Please set it in environment variables or provide an API key.',
        },
        { status: 400 }
      )
    }

    const result = await analyzeChatContent(content, apiKeyToUse)

    return NextResponse.json(result)
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      )
    }

    const err = error as { message?: string; status?: number; stack?: string }

    // Enhanced error handling
    if (err?.message?.includes('API_KEY') || err?.message?.includes('GEMINI_API_KEY')) {
      return NextResponse.json(
        {
          error: 'API Key Error',
          message: err.message || 'Invalid or missing API key configuration',
        },
        { status: 401 }
      )
    }

    if (err?.status === 429) {
      return NextResponse.json({ error: 'Quota Exceeded' }, { status: 429 })
    }

    logger.error('API', 'Internal AI Generate Error', err)

    return NextResponse.json(
      { error: 'Internal Server Error', message: err.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
