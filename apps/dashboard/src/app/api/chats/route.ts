import { createChatSchema, updateChatSchema } from '@brainbox/validation'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// --- Helpers ---

/**
 * Centrailzed helper to get an authenticated Supabase client for both Web and Extension
 */
async function getAuthenticatedClient(request: NextRequest) {
  const cookieStore = cookies()
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')

  let supabase

  if (token) {
    // Extension Request (Bearer Token)
    supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    )
  } else {
    // Web App Request (Cookies)
    supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  return { supabase, user: error ? null : user }
}

// Helper to extract source_id from URL if not provided
function extractSourceId(url: string | undefined, _platform: string | undefined): string | null {
  if (!url) return null

  try {
    const chatgptMatch = url.match(/chatgpt\.com\/c\/([^/#?]+)/)
    if (chatgptMatch) return chatgptMatch[1]

    const claudeMatch = url.match(/claude\.ai\/chat\/([^/#?]+)/)
    if (claudeMatch) return claudeMatch[1]

    const geminiMatch = url.match(/gemini\.google\.com\/(?:app|gem|u\/\d+\/app)\/([^/#?]+)/)
    if (geminiMatch) return geminiMatch[1]
  } catch {
    // Ignore URL parsing errors
  }

  return url // Fallback to full URL
}

// --- Handlers ---

export async function GET(request: NextRequest) {
  const { supabase, user } = await getAuthenticatedClient(request)

  if (!user) {
    return NextResponse.json({ chats: [] }) // or 401, but usually 200 [] is safer for FE
  }

  try {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ chats: data || [] })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: errorMessage ?? 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await getAuthenticatedClient(request)

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const validatedData = createChatSchema.parse(body)

    const sourceId =
      validatedData.source_id || extractSourceId(validatedData.url, validatedData.platform)

    // 1. Check for existing chat to detect duplication and prevent data loss
    let existingChat: { messages: unknown[]; id: string } | null = null
    if (sourceId) {
      const { data } = await supabase
        .from('chats')
        .select('id, messages, title, platform, url, folder_id, content')
        .eq('user_id', user.id)
        .eq('source_id', sourceId)
        .maybeSingle()
      existingChat = data as { messages: unknown[]; id: string } | null
    }

    const incomingMessages = (validatedData as any).messages || []
    const existingMessages = Array.isArray(existingChat?.messages) ? existingChat?.messages : []

    // DATA LOSS PREVENTION:
    if (existingChat && incomingMessages.length < existingMessages.length) {
      return NextResponse.json({
        ...existingChat,
        is_duplicate: true,
        is_downgrade: true,
        message: 'Stored version is more complete. Update skipped to prevent data loss.',
      })
    }

    // 2. Perform the upsert
    const { data, error } = await supabase
      .from('chats')
      .upsert(
        {
          user_id: user.id,
          ...validatedData,
          source_id: sourceId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id, source_id',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      ...data,
      is_duplicate: !!existingChat,
      is_downgrade: false,
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: errorMessage ?? 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const { supabase, user } = await getAuthenticatedClient(request)

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const validatedData = updateChatSchema.parse(body)
    const { id, ...updates } = validatedData

    const { data, error } = await supabase
      .from('chats')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: errorMessage ?? 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const { supabase, user } = await getAuthenticatedClient(request)

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const ids = searchParams.get('ids')
    if (!ids) return NextResponse.json(
      { error: 'Chat IDs are required' },
      { status: 400 }
    )

    const chatIds = ids.split(',').filter((id) => id.trim())
    if (chatIds.length === 0) return NextResponse.json(
      { error: 'No valid chat IDs provided' },
      { status: 400 }
    )

    const { error } = await supabase.from('chats').delete().eq('user_id', user.id).in('id', chatIds)

    if (error) throw error
    return NextResponse.json({ success: true, deletedCount: chatIds.length })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: errorMessage ?? 'Internal Server Error' },
      { status: 500 }
    )
  }
}
