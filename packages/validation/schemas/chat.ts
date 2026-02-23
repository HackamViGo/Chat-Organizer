import { z } from 'zod';

import { messageSchema } from './message';

// 2. Define the Platform enum strictly
export const platformEnum = z.enum([
  'chatgpt', 'claude', 'gemini', 'grok', 
  'perplexity', 'lmarena', 'deepseek', 'qwen'
]);

export const createChatSchema = z.object({
  title: z.string().min(1),
  content: z.string().nullable().optional(), // Fixed: Made nullable
  platform: platformEnum.optional(),         // Fixed: Strict enum
  url: z.string().url().optional().or(z.literal('')),
  folder_id: z.string().uuid().nullable().optional(),
  source_id: z.string().optional(),
  messages: z.array(messageSchema).optional(), // Fixed: Removed z.any()
  summary: z.string().optional().nullable(),
  detailed_summary: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  tasks: z.array(z.object({
    id: z.string().optional(),
    text: z.string(),
    completed: z.boolean().default(false),
    priority: z.enum(['low', 'medium', 'high']).optional(),
  })).optional().nullable(),
  embedding: z.array(z.number()).optional().nullable(),
});

export const updateChatSchema = createChatSchema.partial().extend({
  id: z.string().uuid(),
  is_archived: z.boolean().optional(), // Fixed: Added missing field
});

// export type Message = z.infer<typeof messageSchema>; // removed locally
export type CreateChatInput = z.infer<typeof createChatSchema>;
export type UpdateChatInput = z.infer<typeof updateChatSchema>;
