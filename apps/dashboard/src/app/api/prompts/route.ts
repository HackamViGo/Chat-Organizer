import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Zod schemas for validation
const updatePromptSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  folder_id: z.string().uuid().nullable().optional(),
  use_in_context_menu: z.boolean().optional(),
});

const createPromptSchema = z.object({
  title: z.string().min(1),
  content: z.string(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  folder_id: z.string().uuid().nullable().optional(),
  use_in_context_menu: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    // No auth required - prompts are synced from IndexedDB
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

    // Get user from cookies (for web app) - optional
    const { data: { user } } = await supabase.auth.getUser();

    // Check if we need to filter by use_in_context_menu (for extension)
    const useInContextMenu = request.nextUrl.searchParams.get('use_in_context_menu');
    
    let query = supabase.from('prompts').select('*');
    
    // If user is logged in, filter by user_id
    if (user) {
      query = query.eq('user_id', user.id);
    }
    
    // If use_in_context_menu parameter is true, filter only those prompts
    if (useInContextMenu === 'true') {
      try {
        query = query.eq('use_in_context_menu', true);
      } catch (e) {
        // Column might not exist yet - log warning but continue
        console.warn('[API] use_in_context_menu column might not exist yet:', e);
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    
    // If error is about missing column, return all prompts as fallback
    if (error && error.message && error.message.includes('use_in_context_menu')) {
      console.warn('[API] use_in_context_menu column not found, returning all prompts');
      // Retry without the filter
      let fallbackQuery = supabase.from('prompts').select('*');
      if (user) {
        fallbackQuery = fallbackQuery.eq('user_id', user.id);
      }
      fallbackQuery = fallbackQuery.order('created_at', { ascending: false });
      
      const { data: fallbackData, error: fallbackError } = await fallbackQuery;
      
      if (fallbackError) {
        throw fallbackError;
      }
      
      return NextResponse.json({ prompts: fallbackData || [] });
    }

    if (error) throw error;

    return NextResponse.json({ prompts: data || [] });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new NextResponse(errorMessage, { 
      status: 500
    });
  }
}

export async function PUT(request: NextRequest) {
  const cookieStore = cookies();

  // Check for Authorization header (for extension)
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  let supabase;
  let user;

  // Scenario 1: Extension Request (Bearer Token)
  if (token) {
    const { createClient } = await import('@supabase/supabase-js');
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const { data: { user: tokenUser }, error } = await supabase.auth.getUser();
    if (!error && tokenUser) {
      user = tokenUser;
    }
  } else {
    // Scenario 2: Web App Request (Cookies)
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

    const { data: { user: cookieUser } } = await supabase.auth.getUser();
    user = cookieUser;
  }

  if (!user) {
    return new NextResponse('Unauthorized', {
      status: 401
    });
  }

  try {
    const body = await request.json();
    const validatedData = updatePromptSchema.parse(body);
    const { id, ...updates } = validatedData;

    // Update prompt that belongs to the user
    const { data, error } = await supabase
      .from('prompts')
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
    return new NextResponse(errorMessage, { 
      status: 500
    });
  }
}

export async function POST(request: NextRequest) {
  const cookieStore = cookies();

  // Check for Authorization header (for extension)
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  let supabase;
  let user;

  // Scenario 1: Extension Request (Bearer Token)
  if (token) {
    // Create a client specifically using this token
    const { createClient } = await import('@supabase/supabase-js');
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const { data: { user: tokenUser }, error } = await supabase.auth.getUser();
    if (!error && tokenUser) {
      user = tokenUser;
    }
  } else {
    // Scenario 2: Web App Request (Cookies)
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

    const { data: { user: cookieUser } } = await supabase.auth.getUser();
    user = cookieUser;
  }

  if (!user) {
    return new NextResponse('Unauthorized', {
      status: 401
    });
  }

  try {
    const body = await request.json();
    const validatedData = createPromptSchema.parse(body);

    const { data, error } = await supabase
      .from('prompts')
      .insert({
        user_id: user.id,
        title: validatedData.title,
        content: validatedData.content,
        color: validatedData.color || '#6366f1',
        folder_id: validatedData.folder_id,
        use_in_context_menu: validatedData.use_in_context_menu || false,
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
    return new NextResponse(errorMessage, { 
      status: 500
    });
  }
}
