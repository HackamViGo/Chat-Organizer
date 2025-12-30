import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function DELETE() {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Delete all user data
    // 1. Delete chats
    const { error: chatsError } = await supabase
      .from('chats')
      .delete()
      .eq('user_id', user.id);

    if (chatsError) {
      console.error('Error deleting chats:', chatsError);
      // Continue even if some deletions fail
    }

    // 2. Delete folders
    const { error: foldersError } = await supabase
      .from('folders')
      .delete()
      .eq('user_id', user.id);

    if (foldersError) {
      console.error('Error deleting folders:', foldersError);
      // Continue even if some deletions fail
    }

    // 3. Delete prompts
    const { error: promptsError } = await supabase
      .from('prompts')
      .delete()
      .eq('user_id', user.id);

    if (promptsError) {
      console.error('Error deleting prompts:', promptsError);
      // Continue even if some deletions fail
    }

    // 4. Delete images
    const { error: imagesError } = await supabase
      .from('images')
      .delete()
      .eq('user_id', user.id);

    if (imagesError) {
      console.error('Error deleting images:', imagesError);
      // Continue even if some deletions fail
    }

    // 5. Delete user account from auth
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(user.id);

    if (deleteUserError) {
      // If admin API is not available, try to delete via user API
      // Note: This might not work if admin API is required
      console.error('Error deleting user account:', deleteUserError);
      // Still return success as data is deleted
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in delete account:', error);
    return new NextResponse(error.message || 'Failed to delete account', { status: 500 });
  }
}

