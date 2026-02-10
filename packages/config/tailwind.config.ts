import type { Config } from 'tailwindcss';

/**
 * Base Tailwind CSS v4 configuration for BrainBox monorepo
 * Apps should extend this config and add their specific content paths
 */
export default {
  content: [],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
