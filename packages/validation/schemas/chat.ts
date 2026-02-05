/**
 * @brainbox/validation - Chat Schemas
 * Extracted from src/app/api/chats/route.ts
 */
import { z } from 'zod';

export const createChatSchema = z.object({
  title: z.string().min(1),
  content: z.string(),
  platform: z.string().optional(),
  url: z.string().url().optional().or(z.literal('')),
  folder_id: z.string().uuid().nullable().optional(),
  source_id: z.string().optional(),
  messages: z.array(z.any()).optional(),
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
});

export type CreateChatInput = z.infer<typeof createChatSchema>;
export type UpdateChatInput = z.infer<typeof updateChatSchema>;
