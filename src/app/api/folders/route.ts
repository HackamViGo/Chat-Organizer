import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// CORS headers for Chrome extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

// Zod schemas for validation
const updateFolderSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  type: z.enum(['chat', 'image', 'prompt', 'list', 'default', 'custom']).optional(),
  icon: z.string().optional(),
  parent_id: z.string().uuid().nullable().optional(),
});

const createFolderSchema = z.object({
  name: z.string().min(1),
  color: z.string().min(1),
  type: z.enum(['chat', 'image', 'prompt', 'list', 'default', 'custom']).optional(),
  icon: z.string().optional(),
  parent_id: z.string().uuid().nullable().optional(),
});

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

    // Verify auth context by checking current user
    const { data: { user: verifiedUser }, error: authCheckError } = await supabase.auth.getUser();
    if (authCheckError || !verifiedUser) {
      return new NextResponse('Authentication context error', { 
        status: 401,
        headers: corsHeaders 
      });
    }
    
    if (verifiedUser.id !== user.id) {
      return new NextResponse('User ID mismatch', { 
        status: 403,
        headers: corsHeaders 
      });
    }

    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API /folders] Database error:', error);
      throw error;
    }
    return NextResponse.json({ folders: data || [] }, { headers: corsHeaders });
  } catch (error) {
    console.error('[API /folders] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new NextResponse(errorMessage, { 
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
    const validatedData = updateFolderSchema.parse(body);
    const { id, ...updates } = validatedData;

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
    const updatesWithParent = updates as { parent_id?: string | null; [key: string]: any };
    if (updatesWithParent.parent_id) {
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
        
        if (isDescendant(updatesWithParent.parent_id, id)) {
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400, headers: corsHeaders }
      );
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new NextResponse(errorMessage, {
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new NextResponse(errorMessage, {
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
    const validatedData = createFolderSchema.parse(body);
    const { name, color, type, icon } = validatedData;

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
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400, headers: corsHeaders }
      );
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new NextResponse(errorMessage, { 
      status: 500,
      headers: corsHeaders 
    });
  }
}
