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
});

export const updateChatSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  platform: z.string().optional(),
  url: z.string().url().optional().or(z.literal('')),
  folder_id: z.string().uuid().nullable().optional(),
  source_id: z.string().optional(),
  messages: z.array(z.any()).optional(),
});

export type CreateChatInput = z.infer<typeof createChatSchema>;
export type UpdateChatInput = z.infer<typeof updateChatSchema>;
