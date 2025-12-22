import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// CORS headers for Chrome extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Extension-Key',
  'Access-Control-Allow-Credentials': 'true',
};

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    // Get extension key from header
    const extensionKey = request.headers.get('X-Extension-Key');
    
    if (!extensionKey) {
      return new NextResponse('Missing extension key', { 
        status: 401,
        headers: corsHeaders 
      });
    }

    // Get Authorization header (Supabase access token)
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new NextResponse('Missing or invalid authorization', { 
        status: 401,
        headers: corsHeaders 
      });
    }

    const accessToken = authHeader.replace('Bearer ', '');

    // Create Supabase client with service role key to verify user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    );

    // Verify user with access token
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new NextResponse('Invalid access token', { 
        status: 401,
        headers: corsHeaders 
      });
    }

    // Get request body
    const body = await request.json();
    const { title, content, platform, url, folder_id } = body;

    // Save chat to database
    const { data, error } = await supabase
      .from('chats')
      .insert({
        user_id: user.id,
        title,
        content,
        platform,
        url,
        folder_id,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Extension API error:', error);
    return new NextResponse(error.message || 'Internal server error', { 
      status: 500,
      headers: corsHeaders 
    });
  }
}
