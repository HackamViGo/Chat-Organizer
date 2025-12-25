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
    const accessToken = authHeader.replace('Bearer ', '');
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
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
  return await supabase.auth.getUser();
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

    // Use direct supabase client for database query
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ folders: data }, { headers: corsHeaders });
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

    const body = await request.json();
    const { name, color, type, icon } = body;

    // Use direct supabase client for database query
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
      .from('folders')
      .insert({
        user_id: user.id,
        name,
        color,
        type,
        icon,
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
