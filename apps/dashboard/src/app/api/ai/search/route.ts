import { NextResponse } from 'next/server';
import { generateEmbedding } from '../../../../lib/services/ai';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { aiRateLimit } from '@/lib/rate-limit';
import { aiSearchRequestSchema } from '@brainbox/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, limit, threshold } = aiSearchRequestSchema.parse(body);

    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // S4-3: Rate Limiting
    if (aiRateLimit) {
      const { success } = await aiRateLimit.limit(user.id);
      if (!success) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
      }
    }

    // 1. Generate embedding for the query string
    const embedding = await generateEmbedding(query);

    // 2. Call the Supabase RPC function for vector similarity search
    const { data: chats, error } = await (supabase as any).rpc('match_chats', {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: limit,
      p_user_id: user.id,
    });

    if (error) {
      console.error('Semantic Search RPC Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(chats);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
