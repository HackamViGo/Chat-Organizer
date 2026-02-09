import { z } from 'zod';

export const PrivacyConfigSchema = z.object({
  enabled: z.boolean().default(true),
  maskEmail: z.boolean().default(true),
  maskPhone: z.boolean().default(true),
  maskCreditCard: z.boolean().default(true),
  customPatterns: z.array(z.object({
    name: z.string(),
    pattern: z.string(), // Regex string
    replacement: z.string().default('[MASKED]'),
  })).default([]),
});

export type PrivacyConfig = z.infer<typeof PrivacyConfigSchema>;
