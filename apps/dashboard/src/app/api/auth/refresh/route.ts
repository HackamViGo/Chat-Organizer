import { NextRequest, NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    // Handle empty body gracefully
    let body;
    try {
      const text = await request.text();
      body = text ? JSON.parse(text) : {};
    } catch (e) {
      body = {};
    }

    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Refresh token using Supabase Auth API directly
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error_description || errorData.error || 'Failed to refresh token' },
        { status: response.status, headers: corsHeaders }
      );
    }

    const data = await response.json();
    
    // Supabase returns: access_token, refresh_token, expires_in, expires_at, token_type, user
    if (data.error || !data.access_token) {
      return NextResponse.json(
        { error: data.error_description || data.error || 'Invalid response from Supabase' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Check if remember me is enabled (from cookie)
    const rememberMeCookie = request.cookies.get('brainbox_remember_me');
    const isRememberMe = rememberMeCookie?.value === 'true';

    // Calculate expiresAt
    let expiresAt: number | null = null;
    if (isRememberMe) {
      // 30 days from now in milliseconds
      expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000);
    } else if (data.expires_at) {
      // Use Supabase's expires_at (already in seconds, convert to milliseconds)
      expiresAt = data.expires_at * 1000;
    } else if (data.expires_in) {
      // Fallback: calculate from expires_in (seconds)
      expiresAt = Date.now() + (data.expires_in * 1000);
    }

    return NextResponse.json(
      {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('[API] Refresh token error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

