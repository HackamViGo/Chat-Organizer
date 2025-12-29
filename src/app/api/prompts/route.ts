import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// CORS headers for Chrome extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

// Helper to get user from either cookies or Authorization header
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  
  // If Authorization header exists, use it (for extension)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );
    return await supabase.auth.getUser();
  }
  
  // Otherwise use cookies (for web app)
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
  return await supabase.auth.getUser();
}

// Helper to get supabase client for querying
function getSupabaseClient(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );
  }
  
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return new NextResponse('Unauthorized', { 
        status: 401,
        headers: corsHeaders 
      });
    }

    const supabase = getSupabaseClient(request);

    // Check if we need to filter by use_in_context_menu (for extension)
    const useInContextMenu = request.nextUrl.searchParams.get('use_in_context_menu');
    
    let query = supabase
      .from('prompts')
      .select('*')
      .eq('user_id', user.id);
    
    // If use_in_context_menu parameter is true, filter only those prompts
    // Note: If column doesn't exist yet, this will return all prompts (graceful degradation)
    if (useInContextMenu === 'true') {
      try {
        query = query.eq('use_in_context_menu', true);
      } catch (e) {
        // Column might not exist yet - log warning but continue
        console.warn('[API] use_in_context_menu column might not exist yet:', e);
        // Return all prompts as fallback
      }
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    // If error is about missing column, return all prompts as fallback
    if (error && error.message && error.message.includes('use_in_context_menu')) {
      console.warn('[API] use_in_context_menu column not found, returning all prompts');
      // Retry without the filter
      const fallbackQuery = supabase
        .from('prompts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      const { data: fallbackData, error: fallbackError } = await fallbackQuery;
      
      if (fallbackError) {
        throw fallbackError;
      }
      
      return NextResponse.json({ prompts: fallbackData || [] }, { headers: corsHeaders });
    }

    if (error) throw error;

    return NextResponse.json({ prompts: data }, { headers: corsHeaders });
  } catch (error: any) {
    return new NextResponse(error.message, { 
      status: 500,
      headers: corsHeaders 
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return new NextResponse('Unauthorized', { 
        status: 401,
        headers: corsHeaders 
      });
    }

    const supabase = getSupabaseClient(request);

    const body = await request.json();
    const { title, content, color, folder_id, use_in_context_menu } = body;

    const { data, error } = await supabase
      .from('prompts')
      .insert({
        user_id: user.id,
        title,
        content,
        color: color || '#6366f1',
        folder_id,
        use_in_context_menu: use_in_context_menu || false,
      } as any)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error: any) {
    return new NextResponse(error.message, { 
      status: 500,
      headers: corsHeaders 
    });
  }
}
