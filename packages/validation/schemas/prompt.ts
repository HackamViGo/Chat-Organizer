/**
 * @brainbox/validation - Prompt Schemas
 * Extracted from src/app/api/prompts/route.ts
 */
import { z } from 'zod';

export const createPromptSchema = z.object({
  title: z.string().min(1),
  content: z.string(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  folder_id: z.string().uuid().nullable().optional(),
  use_in_context_menu: z.boolean().optional(),
});

export const updatePromptSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  folder_id: z.string().uuid().nullable().optional(),
  use_in_context_menu: z.boolean().optional(),
});

export type CreatePromptInput = z.infer<typeof createPromptSchema>;
export type UpdatePromptInput = z.infer<typeof updatePromptSchema>;

export const searchQuerySchema = z.object({
  query: z.string().min(1)
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
