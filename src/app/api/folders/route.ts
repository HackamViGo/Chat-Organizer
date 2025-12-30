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
      console.log('[API /folders] Unauthorized:', authError?.message || 'No user');
      return new NextResponse('Unauthorized', { 
        status: 401,
        headers: corsHeaders 
      });
    }

    console.log('[API /folders] Fetching folders for user:', user.id);
    console.log('[API /folders] User email:', user.email);

    // Use server client with proper auth context
    const cookieStore = cookies();
    const authHeader = request.headers.get('Authorization');
    
    let supabase;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extension request - use token-based client
      console.log('[API /folders] Using Bearer token auth');
      supabase = createClient(
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
    } else {
      // Web app request - use cookie-based client
      console.log('[API /folders] Using cookie-based auth');
      const { createServerClient } = await import('@supabase/ssr');
      supabase = createServerClient(
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
    }

    // Verify auth context by checking current user
    const { data: { user: verifiedUser }, error: authCheckError } = await supabase.auth.getUser();
    if (authCheckError || !verifiedUser) {
      console.error('[API /folders] Auth context error:', authCheckError);
      return new NextResponse('Authentication context error', { 
        status: 401,
        headers: corsHeaders 
      });
    }
    
    if (verifiedUser.id !== user.id) {
      console.error('[API /folders] User ID mismatch:', {
        requestUser: user.id,
        verifiedUser: verifiedUser.id
      });
      return new NextResponse('User ID mismatch', { 
        status: 403,
        headers: corsHeaders 
      });
    }

    console.log('[API /folders] Verified user:', verifiedUser.id);

    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API /folders] Database error:', error);
      console.error('[API /folders] Error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log('[API /folders] Returning folders:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('[API /folders] Sample folder:', { id: data[0].id, name: data[0].name, user_id: data[0].user_id });
    }
    return NextResponse.json({ folders: data || [] }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('[API /folders] Error:', error);
    return new NextResponse(error.message, { 
      status: 500,
      headers: corsHeaders 
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return new NextResponse('Unauthorized', { 
        status: 401,
        headers: corsHeaders 
      });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return new NextResponse('Folder ID is required', {
        status: 400,
        headers: corsHeaders
      });
    }

    // Use server client with proper auth context
    const cookieStore = cookies();
    const authHeader = request.headers.get('Authorization');
    
    let supabase;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extension request - use token-based client
      supabase = createClient(
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
    } else {
      // Web app request - use cookie-based client
      const { createServerClient } = await import('@supabase/ssr');
      supabase = createServerClient(
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
    }

    // Prevent circular references - check if target folder is a descendant
    if (updates.parent_id) {
      const { data: allFolders } = await supabase
        .from('folders')
        .select('id, parent_id')
        .eq('user_id', user.id);
      
      if (allFolders) {
        const isDescendant = (folderId: string, targetParentId: string): boolean => {
          const folder = allFolders.find(f => f.id === folderId);
          if (!folder || !folder.parent_id) return false;
          if (folder.parent_id === targetParentId) return true;
          return isDescendant(folder.parent_id, targetParentId);
        };
        
        if (isDescendant(updates.parent_id, id)) {
          return new NextResponse('Cannot move folder into its own descendant', {
            status: 400,
            headers: corsHeaders
          });
        }
      }
    }

    // Update folder that belongs to the user
    const { data, error } = await supabase
      .from('folders')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
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

export async function DELETE(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return new NextResponse('Unauthorized', { 
        status: 401,
        headers: corsHeaders 
      });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return new NextResponse('Folder ID is required', {
        status: 400,
        headers: corsHeaders
      });
    }

    // Use server client with proper auth context
    const cookieStore = cookies();
    const authHeader = request.headers.get('Authorization');
    
    let supabase;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extension request - use token-based client
      supabase = createClient(
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
    } else {
      // Web app request - use cookie-based client
      const { createServerClient } = await import('@supabase/ssr');
      supabase = createServerClient(
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
    }

    // Delete folder that belongs to the user
    // Note: CASCADE delete will handle child folders and items
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true }, { headers: corsHeaders });
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

    // Use server client with proper auth context
    const cookieStore = cookies();
    const authHeader = request.headers.get('Authorization');
    
    let supabase;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extension request - use token-based client
      supabase = createClient(
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
    } else {
      // Web app request - use cookie-based client
      supabase = createServerClient(
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
    }

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
