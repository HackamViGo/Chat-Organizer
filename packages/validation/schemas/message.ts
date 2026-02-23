import { z } from 'zod';

export const messageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.number(),
  metadata: z.object({
    model: z.string().optional(),
    images: z.array(z.string()).optional(),
  }).passthrough().optional(),
});

export type MessageInput = z.infer<typeof messageSchema>;
