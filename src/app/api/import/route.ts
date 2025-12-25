import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { chats } = body;

    if (!Array.isArray(chats)) {
      return new NextResponse('Invalid data format', { status: 400 });
    }

    // Insert chats with user_id
    const chatsToInsert = chats.map((chat: any) => ({
      ...chat,
      user_id: user.id,
      id: undefined, // Let DB generate new IDs
    }));

    const { error } = await supabase.from('chats').insert(chatsToInsert as any);

    if (error) throw error;

    return NextResponse.json({ success: true, imported: chatsToInsert.length });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
