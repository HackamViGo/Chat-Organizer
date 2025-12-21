import { NextResponse } from 'next/server';
import { analyzeChatContent } from '@/lib/services/ai';
import { z } from 'zod';

const requestSchema = z.object({
  content: z.string().min(1),
  apiKey: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content, apiKey } = requestSchema.parse(body);

    const result = await analyzeChatContent(content, apiKey);

    return NextResponse.json(result);
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
