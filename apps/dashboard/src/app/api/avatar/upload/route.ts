import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    // Check for Authorization header (for extension)
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    let supabase;
    let user;
    
    if (token) {
      // Extension request with Bearer token
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: { headers: { Authorization: `Bearer ${token}` } }
        }
      );
      const { data: { user: tokenUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !tokenUser) {
        return new NextResponse('Unauthorized', { status: 401, headers: corsHeaders });
      }
      user = tokenUser;
    } else {
      // Web app request with cookies
      supabase = createServerSupabaseClient();
      const { data: { user: cookieUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !cookieUser) {
        return new NextResponse('Unauthorized', { status: 401, headers: corsHeaders });
      }
      user = cookieUser;
    }

    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate file size (max 1MB)
    const maxSize = 1 * 1024 * 1024; // 1MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 1MB' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    const filePath = fileName; // Path is relative to bucket root

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true, // Replace if exists
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload avatar', details: uploadError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Verify file was uploaded successfully
    const { data: fileData, error: fileError } = await supabase.storage
      .from('avatars')
      .list(user.id, {
        limit: 1,
        search: filePath.split('/').pop()
      });

    if (fileError) {
      console.error('File verification error:', fileError);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const avatarUrl = urlData.publicUrl;
    
    console.log('Avatar uploaded successfully. URL:', avatarUrl);
    console.log('File path:', filePath);

    // Update user record in database
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user avatar', details: updateError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { avatar_url: avatarUrl },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Avatar upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

