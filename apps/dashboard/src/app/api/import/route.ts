import { NextResponse } from 'next/server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await request.json()
    const { chats, folders } = body

    if (!Array.isArray(chats)) {
      return new NextResponse('Invalid data format: chats must be an array', { status: 400 })
    }

    let importedChats = 0
    let importedFolders = 0

    // Import folders first (if provided)
    if (folders && Array.isArray(folders)) {
      const foldersToInsert = folders.map((folder: any) => ({
        ...folder,
        user_id: user.id,
        id: undefined, // Let DB generate new IDs
      }))

      const { error: foldersError } = await supabase.from('folders').insert(foldersToInsert as any)
      if (foldersError) throw foldersError
      importedFolders = foldersToInsert.length
    }

    // Insert chats with user_id
    const chatsToInsert = chats.map((chat: any) => ({
      ...chat,
      user_id: user.id,
      id: undefined, // Let DB generate new IDs
    }))

    const { error: chatsError } = await supabase.from('chats').insert(chatsToInsert as any)
    if (chatsError) throw chatsError
    importedChats = chatsToInsert.length

    return NextResponse.json({
      success: true,
      imported: {
        chats: importedChats,
        folders: importedFolders,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new NextResponse(message, { status: 500 })
  }
}
