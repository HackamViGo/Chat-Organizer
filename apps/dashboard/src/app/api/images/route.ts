import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  let supabase;
  let user;

  if (token) {
    const { createClient } = await import('@supabase/supabase-js');
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } }
      }
    );
    const { data: { user: tokenUser } } = await supabase.auth.getUser();
    user = tokenUser;
  } else {
    supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }); },
          remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: '', ...options }); },
        },
      }
    );
    const { data: { user: cookieUser } } = await supabase.auth.getUser();
    user = cookieUser;
  }

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401, headers: corsHeaders });
  }

  try {
    const { data, error } = await supabase
      .from('images')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ images: data || [] }, { headers: corsHeaders });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  let supabase;
  let user;

  if (token) {
    // Extension request with Bearer token
    const { createClient } = await import('@supabase/supabase-js');
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } }
      }
    );
    const { data: { user: tokenUser } } = await supabase.auth.getUser();
    user = tokenUser;
  } else {
    // Web app request with cookies
    supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }); },
          remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: '', ...options }); },
        },
      }
    );
    const { data: { user: cookieUser } } = await supabase.auth.getUser();
    user = cookieUser;
  }

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401, headers: corsHeaders });
  }

  try {
    const body = await request.json();

    // Helper function to download and upload image to Storage
    const uploadImageToStorage = async (imageUrl: string, imageName: string): Promise<{ url: string; path: string; mime_type: string; size: number }> => {
      try {
        // Download image
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
        }

        const blob = await imageResponse.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Validate size (max 2MB)
        if (buffer.length > 2 * 1024 * 1024) {
          throw new Error('Image too large (max 2MB)');
        }

        // Generate unique filename
        const timestamp = Date.now();
        const sanitizedName = imageName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileExt = blob.type.split('/')[1] || 'jpg';
        const fileName = `${user.id}/${timestamp}_${sanitizedName}.${fileExt}`;

        // Upload to Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('images')
          .upload(fileName, buffer, {
            contentType: blob.type,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Storage upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(fileName);

        return {
          url: publicUrl,
          path: fileName,
          mime_type: blob.type,
          size: buffer.length
        };
      } catch (error: any) {
        throw error;
      }
    };

    // Handle both single and multiple image formats
    let imagesToInsert: Array<{
      user_id: string;
      url: string;
      path: string;
      name: string;
      mime_type: string;
      size: number;
      source_url?: string;
    }> = [];

    if (body.images && Array.isArray(body.images)) {
      // Bulk format: { images: [src1, src2...] } or { images: [{url, name}...] }
      for (const img of body.images) {
        const imageUrl = typeof img === 'string' ? img : (img.url || img.src);
        const imageName = img.name || img.title || 'Extracted Image';
        
        if (!imageUrl) continue;

        try {
          const storageData = await uploadImageToStorage(imageUrl, imageName);
          imagesToInsert.push({
            user_id: user.id,
            url: storageData.url,
            path: storageData.path,
            name: imageName,
            mime_type: storageData.mime_type,
            size: storageData.size,
            source_url: body.source_url || img.source_url || imageUrl
          });
        } catch (error: any) {
          // Skip this image but continue with others
        }
      }
    } else {
      // Single format: { url, title, source_url... }
      const imageUrl = body.url || body.src;
      const imageName = body.title || body.name || 'Extracted Image';
      
      if (imageUrl) {
        try {
          const storageData = await uploadImageToStorage(imageUrl, imageName);
          imagesToInsert.push({
            user_id: user.id,
            url: storageData.url,
            path: storageData.path,
            name: imageName,
            mime_type: storageData.mime_type,
            size: storageData.size,
            source_url: body.source_url || imageUrl
          });
        } catch (error: any) {
          throw error;
        }
      }
    }

    if (imagesToInsert.length === 0) {
      return NextResponse.json(
        { error: 'No images were successfully uploaded' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { data, error } = await supabase
      .from('images')
      .insert(imagesToInsert)
      .select();

    if (error) {
      console.error('[BrainBox API] Insert error:', error);
      throw error;
    }
    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error: any) {
    console.error('[BrainBox API] Failed to save images:', error.message);
    return new NextResponse(error.message, { status: 500, headers: corsHeaders });
  }
}