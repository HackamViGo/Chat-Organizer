import { NextRequest, NextResponse } from 'next/server';
import { SmartPromptSearch } from '@/lib/services/smart-prompt-search';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const result = await SmartPromptSearch.findBestMatch(query);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Prompt search error:', error);
    
    // Return error response with helpful message
    return NextResponse.json(
      { 
        error: error.message || 'Search failed. Please check your internet connection and try again.',
        fallback: true 
      },
      { status: 500 }
    );
  }
}

