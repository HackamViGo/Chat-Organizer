import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  const cookieStore = cookies()
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')

  let supabase
  let user

  if (token) {
    const { createClient } = await import('@supabase/supabase-js')
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
      }
    )
    const {
      data: { user: tokenUser },
    } = await supabase.auth.getUser()
    user = tokenUser
  } else {
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
    const {
      data: { user: cookieUser },
    } = await supabase.auth.getUser()
    user = cookieUser
  }

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401, headers: corsHeaders })
  }

  try {
    // Parallel fetch for counts and user profile
    const [chatsCount, foldersCount, promptsCount, imagesCount, userProfile] = await Promise.all([
      supabase.from('chats').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('folders').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('prompts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('images').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('users').select('avatar_url').eq('id', user.id).single(),
    ])

    // Only return uploaded avatar (from Supabase Storage), not Google avatars
    let avatarUrl: string | null = null
    if (userProfile.data?.avatar_url) {
      const url = userProfile.data.avatar_url
      // Check if it's an uploaded avatar (not Google)
      const isGoogleUrl =
        url.includes('googleusercontent.com') ||
        url.includes('google.com') ||
        url.includes('googleapis.com')
      if (
        !isGoogleUrl &&
        url.includes('supabase.co') &&
        url.includes('/storage/v1/object/public/avatars/')
      ) {
        avatarUrl = url
      }
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
          avatar_url: avatarUrl, // Only uploaded avatars, never Google
        },
        stats: {
          chats: chatsCount.count || 0,
          folders: foldersCount.count || 0,
          prompts: promptsCount.count || 0,
          images: imagesCount.count || 0,
        },
      },
      { headers: corsHeaders }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new NextResponse(message, { status: 500, headers: corsHeaders })
  }
}
