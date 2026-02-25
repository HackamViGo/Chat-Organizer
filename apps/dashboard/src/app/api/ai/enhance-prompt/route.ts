import { NextResponse } from 'next/server';
import { generatePromptImprovement } from '@brainbox/shared';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { aiRateLimit } from '@/lib/rate-limit';
import { aiEnhanceRequestSchema } from '@brainbox/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, apiKey } = aiEnhanceRequestSchema.parse(body);

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

    const enhancedPrompt = await generatePromptImprovement(prompt, apiKey || '');

    return NextResponse.json({ enhancedPrompt });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}









