import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createChatSchema, updateChatSchema } from '@brainbox/validation';

// Helper to extract source_id from URL if not provided
function extractSourceId(url: string | undefined, platform: string | undefined): string | null {
  if (!url) return null;
  
  try {
    const chatgptMatch = url.match(/chatgpt\.com\/c\/([^/#?]+)/);
    if (chatgptMatch) return chatgptMatch[1];
    
    const claudeMatch = url.match(/claude\.ai\/chat\/([^/#?]+)/);
    if (claudeMatch) return claudeMatch[1];
    
    const geminiMatch = url.match(/gemini\.google\.com\/(?:app|gem|u\/\d+\/app)\/([^/#?]+)/);
    if (geminiMatch) return geminiMatch[1];
  } catch (e) {
    // Ignore URL parsing errors
  }
  
  return url; // Fallback to full URL
}

export async function GET(request: NextRequest) {
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

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ chats: [] });
    }

    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ chats: data || [] });
  } catch (error) {
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

  // Scenario 1: Extension Request (Bear Token)
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
    const validatedData = createChatSchema.parse(body);

    const sourceId = validatedData.source_id || extractSourceId(validatedData.url, validatedData.platform);

    // 1. Check for existing chat to detect duplication and prevent data loss
    let existingChat: any = null;
    if (sourceId) {
      const { data } = await supabase
        .from('chats')
        .select('id, messages, title, platform, url, folder_id, content')
        .eq('user_id', user.id)
        .eq('source_id', sourceId)
        .maybeSingle();
      existingChat = data;
    }

    const incomingMessages = validatedData.messages || [];
    const existingMessages = Array.isArray(existingChat?.messages) ? existingChat.messages : [];

    // DATA LOSS PREVENTION: 
    // If the existing chat has MORE messages than the incoming sync, 
    // we don't perform the upsert to avoid overwriting a complete chat with a partial one.
    if (existingChat && incomingMessages.length < existingMessages.length) {
      return NextResponse.json({
        ...existingChat,
        is_duplicate: true,
        is_downgrade: true,
        message: 'Stored version is more complete. Update skipped to prevent data loss.'
      });
    }

    // 2. Perform the upsert (only if it's new or more/equally complete)
    const { data, error } = await supabase
      .from('chats')
      .upsert({
        user_id: user.id,
        title: validatedData.title,
        content: validatedData.content,
        platform: validatedData.platform,
        url: validatedData.url,
        folder_id: validatedData.folder_id,
        source_id: sourceId,
        messages: incomingMessages,
        summary: validatedData.summary,
        detailed_summary: validatedData.detailed_summary,
        tags: validatedData.tags,
        tasks: validatedData.tasks,
        embedding: validatedData.embedding,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id, source_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) throw error;

    // 3. Return data with status flags
    return NextResponse.json({
      ...data,
      is_duplicate: !!existingChat,
      is_downgrade: false
    });
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
    const validatedData = updateChatSchema.parse(body);
    const { id, ...updates } = validatedData;

    // Update chat that belongs to the user
    const { data, error } = await supabase
      .from('chats')
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

export async function DELETE(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids');
    
    if (!ids) {
      return new NextResponse('Chat IDs are required', {
        status: 400
      });
    }

    // Parse IDs - can be single ID or comma-separated list
    const chatIds = ids.split(',').filter(id => id.trim());

    if (chatIds.length === 0) {
      return new NextResponse('No valid chat IDs provided', {
        status: 400
      });
    }

    // Delete chats that belong to the user
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('user_id', user.id)
      .in('id', chatIds);

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      deletedCount: chatIds.length 
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new NextResponse(errorMessage, {
      status: 500
    });
  }
}
