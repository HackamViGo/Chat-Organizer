import { z } from 'zod';

export const promptSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color'),
});

export const updatePromptSchema = promptSchema.partial();

export type PromptFormData = z.infer<typeof promptSchema>;
