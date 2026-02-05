import { z } from 'zod';

export const chatSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  url: z.string().url().optional().or(z.literal('')),
  content: z.string().optional(),
  platform: z.enum(['chatgpt', 'claude', 'gemini', 'other']),
  folder_id: z.string().uuid().optional().nullable(),
  summary: z.string().optional(),
  tasks: z.array(z.any()).optional(),
  is_archived: z.boolean().optional(),
});

export const updateChatSchema = chatSchema.partial();

export type ChatFormData = z.infer<typeof chatSchema>;
