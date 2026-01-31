import { NextRequest, NextResponse } from 'next/server';

// CORS headers for Chrome extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

async function proxyImage(imageUrl: string) {
  // Validate URL format
  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch (e) {
    return NextResponse.json(
      { error: 'Invalid URL format' },
      { status: 400, headers: corsHeaders }
    );
  }

  // Security: Only allow HTTP/HTTPS protocols
  if (!['http:', 'https:'].includes(url.protocol)) {
    return NextResponse.json(
      { error: 'Only HTTP and HTTPS URLs are allowed' },
      { status: 400, headers: corsHeaders }
    );
  }

  // Fetch image from the source URL (server-to-server, no CORS restrictions)
  const response = await fetch(imageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'image/*,*/*;q=0.8',
    },
    // Don't follow redirects automatically - handle them manually if needed
    redirect: 'follow',
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: `Failed to fetch image: ${response.status} ${response.statusText}` },
      { status: response.status, headers: corsHeaders }
    );
  }

  // Get the image data as array buffer
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Get content type from response or default to image/jpeg
  const contentType = response.headers.get('content-type') || 'image/jpeg';

  // Return image with proper headers
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': contentType,
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid url parameter' },
        { status: 400, headers: corsHeaders }
      );
    }

    return await proxyImage(imageUrl);
  } catch (error) {
    console.error('[Proxy Image] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid imageUrl parameter' },
        { status: 400, headers: corsHeaders }
      );
    }

    return await proxyImage(imageUrl);
  } catch (error) {
    console.error('[Proxy Image] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}

