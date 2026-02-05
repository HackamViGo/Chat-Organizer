import { NextResponse } from 'next/server';
import { analyzeChatContent } from '@brainbox/shared';
import { z } from 'zod';

const requestSchema = z.object({
  content: z.string().min(1),
  apiKey: z.string().optional(), // Optional: can use server-side env var instead
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    text: z.string()
  })).optional(),
  systemInstruction: z.string().optional(),
});

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
    const { content, apiKey, history, systemInstruction } = requestSchema.parse(body);

    // Use server-side API key from environment if client doesn't provide one
    // This follows best practice: prefer server-side configuration
    const apiKeyToUse = apiKey || process.env.GEMINI_API_KEY;
    
    console.log('[AI Route] 🤖 Incoming generate request', {
      contentLength: content?.length,
      hasClientApiKey: !!apiKey,
      useServerApiKey: !!process.env.GEMINI_API_KEY,
      resolvedApiKey: apiKeyToUse ? `${apiKeyToUse.substring(0, 6)}...` : 'NONE'
    });

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
