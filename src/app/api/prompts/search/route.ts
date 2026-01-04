import { NextRequest, NextResponse } from 'next/server';
import { SmartPromptSearch } from '@/lib/services/smart-prompt-search';
import { z } from 'zod';

const searchSchema = z.object({
  query: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = searchSchema.parse(body);

    const result = await SmartPromptSearch.findBestMatch(query);

    return NextResponse.json(result);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Query is required and must be a non-empty string', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Prompt search error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Search failed. Please check your internet connection and try again.';
    
    // Return error response with helpful message
    return NextResponse.json(
      { 
        error: errorMessage,
        fallback: true 
      },
      { status: 500 }
    );
  }
}

