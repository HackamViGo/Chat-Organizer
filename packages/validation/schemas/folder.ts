/**
 * @brainbox/validation - Folder Schemas
 * Extracted from src/app/api/folders/route.ts
 */
import { z } from 'zod';

export const folderTypeEnum = z.enum(['chat', 'list', 'image', 'prompt', 'default', 'custom']);

export const createFolderSchema = z.object({
  name: z.string().min(1),
  color: z.string().min(1),
  type: folderTypeEnum.optional(),
  icon: z.string().optional(),
  parent_id: z.string().uuid().nullable().optional(),
});

export const updateFolderSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  type: folderTypeEnum.optional(),
  icon: z.string().optional(),
  parent_id: z.string().uuid().nullable().optional(),
});

export type FolderType = z.infer<typeof folderTypeEnum>;
export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;
