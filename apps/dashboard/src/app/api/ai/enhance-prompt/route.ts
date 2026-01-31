import { NextResponse } from 'next/server';
import { generatePromptImprovement } from '@/lib/services/ai';
import { z } from 'zod';

const requestSchema = z.object({
  prompt: z.string().min(1),
  apiKey: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, apiKey } = requestSchema.parse(body);

    const enhancedPrompt = await generatePromptImprovement(prompt, apiKey);

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









