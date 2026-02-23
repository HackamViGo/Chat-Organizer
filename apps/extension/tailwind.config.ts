import type { Config } from 'tailwindcss';

export default {
  content: ['./src/popup/**/*.{ts,tsx,html}'],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Glassmorphism base
        glass: {
          bg: 'hsl(222 47% 11% / 0.7)',
          border: 'hsl(0 0% 100% / 0.1)',
        },
        // Platform colors for Quick Access grid
        platform: {
          chatgpt: 'hsl(142 71% 45%)',      // Green
          gemini: 'hsl(217 91% 60%)',       // Blue
          claude: 'hsl(25 95% 53%)',        // Orange
          grok: 'hsl(0 0% 100%)',           // White
          perplexity: 'hsl(189 94% 43%)',   // Cyan
          lmarena: 'hsl(43 96% 56%)',       // Gold
          deepseek: 'hsl(217 91% 60%)',     // Blue
          qwen: 'hsl(262 83% 58%)',         // Violet
        },
        // Slate scale for dark UI
        slate: {
          200: 'hsl(210 40% 98%)',
          300: 'hsl(214 32% 91%)',
          400: 'hsl(215 20% 65%)',
          500: 'hsl(215 16% 47%)',
          700: 'hsl(215 25% 27%)',
          800: 'hsl(217 33% 17%)',
          900: 'hsl(222 47% 11%)',
        },
      },
      backdropBlur: {
        xl: '12px',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': {
            opacity: '1',
            filter: 'drop-shadow(0 0 5px currentColor)',
          },
          '50%': {
            opacity: '0.7',
            filter: 'drop-shadow(0 0 12px currentColor)',
          },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s infinite ease-in-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
