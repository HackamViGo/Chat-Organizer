import type { Folder } from '@/types';

/**
 * Get all descendant folder IDs (including nested children)
 */
export function getDescendantFolderIds(folderId: string, allFolders: Folder[]): string[] {
  const descendants: string[] = [folderId];
  
  const findChildren = (parentId: string) => {
    const children = allFolders.filter(f => f.parent_id === parentId);
    children.forEach(child => {
      descendants.push(child.id);
      findChildren(child.id);
    });
  };
  
  findChildren(folderId);
  return descendants;
}

/**
 * Get all items (chats/prompts/images) in a folder including nested subfolders
 */
export function getItemsInFolderAndNested<T extends { folder_id: string | null }>(
  folderId: string | null,
  items: T[],
  allFolders: Folder[]
): T[] {
  if (!folderId) {
    // Return items without folder_id
    return items.filter(item => !item.folder_id);
  }
  
  const descendantIds = getDescendantFolderIds(folderId, allFolders);
  return items.filter(item => item.folder_id && descendantIds.includes(item.folder_id));
}

/**
 * Build folder tree structure
 */
export function buildFolderTree(folders: Folder[], parentId: string | null = null): Folder[] {
  return folders
    .filter(f => f.parent_id === parentId)
    .map(folder => ({
      ...folder,
      children: buildFolderTree(folders, folder.id)
    }));
}

/**
 * Get root folders (folders without parent)
 */
export function getRootFolders(folders: Folder[]): Folder[] {
  return folders.filter(f => !f.parent_id);
}

/**
 * Get nested folders for a specific parent
 */
export function getChildFolders(folders: Folder[], parentId: string | null): Folder[] {
  return folders.filter(f => f.parent_id === parentId);
}








