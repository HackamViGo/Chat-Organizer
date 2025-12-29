import { NextRequest, NextResponse } from 'next/server';

// CORS headers for Chrome extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
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

    console.log('[Proxy Image] 📥 Fetching image from:', imageUrl);

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
      console.error('[Proxy Image] ❌ Failed to fetch image:', response.status, response.statusText);
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

    console.log('[Proxy Image] ✅ Image fetched successfully:', {
      size: buffer.length,
      contentType,
    });

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
  } catch (error: any) {
    console.error('[Proxy Image] ❌ Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

