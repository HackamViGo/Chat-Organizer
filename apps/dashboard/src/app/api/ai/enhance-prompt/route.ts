import { generatePromptImprovement } from '@brainbox/shared'
import { aiEnhanceRequestSchema } from '@brainbox/validation'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { aiRateLimit } from '@/lib/rate-limit'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { prompt, apiKey } = aiEnhanceRequestSchema.parse(body)

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

    const enhancedPrompt = await generatePromptImprovement(prompt, apiKey || '')

    return NextResponse.json({ enhancedPrompt })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : 'An unexpected error occurred'
    return NextResponse.json({ error: 'Internal Server Error', message }, { status: 500 })
  }
}
