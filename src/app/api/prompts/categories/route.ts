import { NextResponse } from 'next/server';
import { SmartPromptSearch } from '@/lib/services/smart-prompt-search';

export async function GET() {
  try {
    const categories = await SmartPromptSearch.getCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Categories fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to load categories' },
      { status: 500 }
    );
  }
}









