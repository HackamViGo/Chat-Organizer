import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderId = formData.get('folderId') as string | null;
    
    if (!file) {
      return new NextResponse('No file provided', { status: 400 });
    }

    // Validation
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/avif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
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

    return NextResponse.json(imageRecord);
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
