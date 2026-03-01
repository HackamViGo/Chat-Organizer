/**
 * @brainbox/validation - AI Platform Schemas
 */
import { z } from 'zod';

export const aiGenerateRequestSchema = z.object({
  content: z.string().min(1),
  apiKey: z.string().optional(),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    text: z.string()
  })).optional(),
  systemInstruction: z.string().optional(),
});

export const aiEnhanceRequestSchema = z.object({
  prompt: z.string().min(1),
  apiKey: z.string().optional(),
});

export const aiSearchRequestSchema = z.object({
  query: z.string().min(1),
  limit: z.number().optional().default(10),
  threshold: z.number().optional().default(0.5),
});

export type AIGenerateRequestInput = z.infer<typeof aiGenerateRequestSchema>;
export type AIEnhanceRequestInput = z.infer<typeof aiEnhanceRequestSchema>;
export type AISearchRequestInput = z.infer<typeof aiSearchRequestSchema>;
