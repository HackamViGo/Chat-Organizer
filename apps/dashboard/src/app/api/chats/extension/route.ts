import { createChatSchema } from '@brainbox/validation'
import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { syncRateLimit } from '@/lib/rate-limit'

// CORS headers for Chrome extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Extension-Key',
  'Access-Control-Allow-Credentials': 'true',
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    // Get extension key from header
    const extensionKey = request.headers.get('X-Extension-Key')
    const validKey = process.env.EXTENSION_KEY

    if (!extensionKey || (validKey && extensionKey !== validKey)) {
      console.warn('[ExtensionAPI] ⚠️ Invalid or missing extension key')
      return new NextResponse('Unauthorized: Invalid extension key', {
        status: 401,
        headers: corsHeaders,
      })
    }

    // Get Authorization header (Supabase access token)
    const authHeader = request.headers.get('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new NextResponse('Missing or invalid authorization', {
        status: 401,
        headers: corsHeaders,
      })
    }

    const accessToken = authHeader.replace('Bearer ', '')

    // Create Supabase client with service role key to verify user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    )

    // Verify user with access token
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return new NextResponse('Invalid access token', {
        status: 401,
        headers: corsHeaders,
      })
    }

    // S4-3: Rate Limiting
    if (syncRateLimit) {
      const { success } = await syncRateLimit.limit(user.id)
      if (!success) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429, headers: corsHeaders }
        )
      }
    }

    // Get request body
    const body = await request.json()

    // S4-1: Zod Validation
    const result = createChatSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400, headers: corsHeaders }
      )
    }

    const { title, content, platform, url, folder_id } = result.data

    // Save chat to database
    const { data, error } = await supabase
      .from('chats')
      .insert({
        user_id: user.id,
        title,
        content,
        platform,
        url,
        folder_id,
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    return NextResponse.json(data, { headers: corsHeaders })
  } catch (error: unknown) {
    console.error('Extension API error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return new NextResponse(message, {
      status: 500,
      headers: corsHeaders,
    })
  }
}
