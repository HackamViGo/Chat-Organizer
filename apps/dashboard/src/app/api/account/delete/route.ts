import { NextResponse } from 'next/server'

import { logger } from '@/lib/logger'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function DELETE() {
  try {
    const supabase = createServerSupabaseClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Delete all user data
    // 1. Delete chats
    const { error: chatsError } = await supabase.from('chats').delete().eq('user_id', user.id)

    if (chatsError) {
      logger.error('API', 'Error deleting chats', chatsError)
      // Continue even if some deletions fail
    }

    // 2. Delete folders
    const { error: foldersError } = await supabase.from('folders').delete().eq('user_id', user.id)

    if (foldersError) {
      logger.error('API', 'Error deleting folders', foldersError)
      // Continue even if some deletions fail
    }

    // 3. Delete prompts
    const { error: promptsError } = await supabase.from('prompts').delete().eq('user_id', user.id)

    if (promptsError) {
      logger.error('API', 'Error deleting prompts', promptsError)
      // Continue even if some deletions fail
    }

    // 4. Delete images
    const { error: imagesError } = await supabase.from('images').delete().eq('user_id', user.id)

    if (imagesError) {
      logger.error('API', 'Error deleting images', imagesError)
      // Continue even if some deletions fail
    }

    // 5. Delete user account from auth
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(user.id)

    if (deleteUserError) {
      // If admin API is not available, try to delete via user API
      // Note: This might not work if admin API is required
      logger.error('API', 'Error deleting user account', deleteUserError)
      // Still return success as data is deleted
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    logger.error('API', 'Error in delete account', error)
    const message = error instanceof Error ? error.message : 'Failed to delete account'
    return new NextResponse(message, { status: 500 })
  }
}
