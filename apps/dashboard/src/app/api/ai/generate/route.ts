import { NextResponse } from 'next/server';
import { analyzeChatContent } from '@brainbox/shared';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { aiRateLimit } from '@/lib/rate-limit';
import { aiGenerateRequestSchema } from '@brainbox/validation';

/**
 * AI Generate API endpoint
 * Follows Google Cloud best practices for API key usage
 * @see https://docs.cloud.google.com/docs/authentication/api-keys-use#node.js
 * 
 * Security: API keys should be stored server-side in environment variables
 * Client-provided API keys are optional and only used if provided
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content, apiKey, history, systemInstruction } = aiGenerateRequestSchema.parse(body);

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

    // Use server-side API key from environment if client doesn't provide one
    // This follows best practice: prefer server-side configuration
    const apiKeyToUse = apiKey || process.env.GEMINI_API_KEY;
    
    /* console.debug('[AI Route] 🤖 Incoming generate request', {
      contentLength: content?.length,
      hasClientApiKey: !!apiKey,
      useServerApiKey: !!process.env.GEMINI_API_KEY,
      resolvedApiKey: apiKeyToUse ? `${apiKeyToUse.substring(0, 6)}...` : 'NONE'
    }); */

    if (!apiKeyToUse) {
      return NextResponse.json(
        { 
          error: 'API Key Required', 
          message: 'GEMINI_API_KEY not configured. Please set it in environment variables or provide an API key.' 
        },
        { status: 400 }
      );
    }

    const result = await analyzeChatContent(content, apiKeyToUse);

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      );
    }

    // Enhanced error handling for API key issues
    if (error?.message?.includes('API_KEY') || error?.message?.includes('GEMINI_API_KEY')) {
      return NextResponse.json(
        { 
          error: 'API Key Error', 
          message: error.message || 'Invalid or missing API key configuration' 
        },
        { status: 401 }
      );
    }

    if (error?.status === 429) {
      return NextResponse.json(
        { 
          error: 'Quota Exceeded', 
          message: 'API quota exceeded. Please try again later.' 
        },
        { status: 429 }
      );
    }

    if (error?.status === 403) {
      return NextResponse.json(
        { 
          error: 'Access Forbidden', 
          message: 'API access forbidden. Please check your API key permissions.' 
        },
        { status: 403 }
      );
    }

    console.error('[AI Route] ❌ Internal Error:', {
      message: error.message,
      stack: error.stack
    });

    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
