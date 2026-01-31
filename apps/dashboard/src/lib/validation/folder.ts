import { z } from 'zod';

export const folderSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color'),
});

export const updateFolderSchema = folderSchema.partial();

export type FolderFormData = z.infer<typeof folderSchema>;
