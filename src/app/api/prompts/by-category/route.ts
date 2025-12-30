import { NextRequest, NextResponse } from 'next/server';
import { SmartPromptSearch } from '@/lib/services/smart-prompt-search';

export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get('category');
    
    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }

    const prompts = await SmartPromptSearch.getByCategory(category);
    
    return NextResponse.json(prompts);

  } catch (error) {
    console.error('Category prompts error:', error);
    return NextResponse.json(
      { error: 'Failed to load prompts' },
      { status: 500 }
    );
  }
}


