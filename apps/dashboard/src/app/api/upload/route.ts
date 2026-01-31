import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// CORS headers for Chrome extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(request: Request) {
  try {
    // Check for Authorization header (for extension)
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
      supabase = createServerSupabaseClient();
      const { data: { user: cookieUser }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        return new NextResponse('Unauthorized', { status: 401, headers: corsHeaders });
      }
      user = cookieUser;
    }
    
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderId = formData.get('folderId') as string | null;
    
    if (!file) {
      return new NextResponse('No file provided', { status: 400, headers: corsHeaders });
    }

    // Validation (reduced to 2MB to fit within 50MB bucket limit)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 400, headers: corsHeaders });
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/avif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400, headers: corsHeaders });
    }

    // Upload to Supabase Storage
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${user.id}/${timestamp}_${sanitizedName}`;
    
    const { data, error } = await supabase.storage
      .from('images')
      .upload(fileName, file);

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(fileName);

    // Save to images table
    const { data: imageRecord, error: dbError } = await supabase.from('images').insert({
      user_id: user.id,
      url: publicUrl,
      path: fileName,
      folder_id: folderId,
      name: file.name,
      mime_type: file.type,
      size: file.size,
    } as any).select().single();

    if (dbError) throw dbError;

    return NextResponse.json(imageRecord, { headers: corsHeaders });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500, headers: corsHeaders });
  }
}
