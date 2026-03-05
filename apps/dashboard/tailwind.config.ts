import baseConfig from '@brainbox/config/tailwind';
import type { Config } from 'tailwindcss';

const config = {
  ...baseConfig,
  plugins: [],
} satisfies Config;

export default config;
