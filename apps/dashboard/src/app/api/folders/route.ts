import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { z } from 'zod';
import {
  createFolderSchema,
  updateFolderSchema,
  type CreateFolderInput,
  type UpdateFolderInput
} from '@brainbox/validation';

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
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
  return await supabase.auth.getUser();
}

export async function GET(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401
      }
    );
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
      return NextResponse.json(
      { error: 'Authentication context error' },
      { status: 401
      }
    );
    }
    
    if (verifiedUser.id !== user.id) {
      return NextResponse.json(
      { error: 'User ID mismatch' },
      { status: 403
      }
    );
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
    return NextResponse.json({ folders: data || [] });
  } catch (error) {
    console.error('[API /folders] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage ?? 'Internal Server Error' },
      { status: 500
    }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401
      }
    );
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
          return NextResponse.json(
      { error: 'Cannot move folder into its own descendant' },
      { status: 400
          }
    );
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

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage ?? 'Internal Server Error' },
      { status: 500
    }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401
      }
    );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
      { error: 'Folder ID is required' },
      { status: 400
      }
    );
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

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage ?? 'Internal Server Error' },
      { status: 500
    }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401
      }
    );
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

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage ?? 'Internal Server Error' },
      { status: 500
    }
    );
  }
}
