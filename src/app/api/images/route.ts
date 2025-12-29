import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  let supabase;
  let user;

  if (token) {
    const { createClient } = await import('@supabase/supabase-js');
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } }
      }
    );
    const { data: { user: tokenUser } } = await supabase.auth.getUser();
    user = tokenUser;
  } else {
    supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }); },
          remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: '', ...options }); },
        },
      }
    );
    const { data: { user: cookieUser } } = await supabase.auth.getUser();
    user = cookieUser;
  }

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401, headers: corsHeaders });
  }

  try {
    const { data, error } = await supabase
      .from('images')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ images: data || [] }, { headers: corsHeaders });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  let supabase;
  let user;

  if (token) {
    // Extension request with Bearer token
    const { createClient } = await import('@supabase/supabase-js');
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } }
      }
    );
    const { data: { user: tokenUser } } = await supabase.auth.getUser();
    user = tokenUser;
  } else {
    // Web app request with cookies
    supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }); },
          remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: '', ...options }); },
        },
      }
    );
    const { data: { user: cookieUser } } = await supabase.auth.getUser();
    user = cookieUser;
  }

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401, headers: corsHeaders });
  }

  try {
    const body = await request.json();

    console.log('[BrainBox API] 📸 Image save request:', {
      hasImages: !!body.images,
      isArray: Array.isArray(body.images),
      imageCount: body.images?.length || 1,
      source_url: body.source_url,
      userId: user.id
    });

    // Handle both single and multiple image formats
    let imagesToInsert: Array<{
      user_id: string;
      url: string;
      name: string;
      source_url?: string;
    }> = [];

    if (body.images && Array.isArray(body.images)) {
      // Bulk format: { images: [src1, src2...] } or { images: [{url, name}...] }
      imagesToInsert = body.images.map((img: any) => {
        const url = typeof img === 'string' ? img : (img.url || img.src);
        return {
          user_id: user.id,
          url: url,
          name: img.name || img.title || 'Extracted Image',
          source_url: body.source_url || img.source_url
        };
      });
    } else {
      // Single format: { url, title, source_url... }
      imagesToInsert = [{
        user_id: user.id,
        url: body.url || body.src,
        name: body.title || body.name || 'Extracted Image',
        source_url: body.source_url
      }];
    }

    console.log('[BrainBox API] 💾 Inserting', imagesToInsert.length, 'images');

    const { data, error } = await supabase
      .from('images')
      .insert(imagesToInsert)
      .select();

    if (error) {
      console.error('[BrainBox API] ❌ Insert error:', error);
      throw error;
    }

    console.log('[BrainBox API] ✅ Images saved:', data?.length);
    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error: any) {
    console.error('[BrainBox API] ❌ Failed to save images:', error.message);
    return new NextResponse(error.message, { status: 500, headers: corsHeaders });
  }
}