import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createPromptSchema, updatePromptSchema } from '@brainbox/validation';

export async function GET(request: NextRequest) {
  try {
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
      query = query.eq('use_in_context_menu', true);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    
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
        ...validatedData,
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
