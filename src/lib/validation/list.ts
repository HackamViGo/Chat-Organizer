import { z } from 'zod';

export const listSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  color: z.enum(['emerald', 'blue', 'purple', 'amber', 'rose', 'cyan']).default('emerald'),
  folder_id: z.string().uuid().optional().nullable(),
});

export const updateListSchema = listSchema.partial();

export const listItemSchema = z.object({
  text: z.string().min(1, 'Item text is required').max(500),
  completed: z.boolean().default(false),
  position: z.number().int().default(0),
});

export const updateListItemSchema = listItemSchema.partial();

export type ListFormData = z.infer<typeof listSchema>;
export type ListItemFormData = z.infer<typeof listItemSchema>;
