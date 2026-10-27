import type { Config } from 'tailwindcss';

// Brand tokens — the Abraj Al Yasir identity shared with the sales site:
// navy (#0A2947 / #123C64), bronze (#C08F5E, text-safe #8B5E3C) and cream.
const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: '#0A2947', foreground: '#ffffff' },
        secondary: { DEFAULT: '#123C64', foreground: '#ffffff' },
        accent: { DEFAULT: '#8B5E3C', foreground: '#ffffff' },
        bronze: { DEFAULT: '#C08F5E', light: '#D9AD80', dark: '#6B4A2F', foreground: '#0A2947' },
        cream: { DEFAULT: '#F3E4C9', soft: '#F8F1E4' },
        gold: { DEFAULT: '#C08F5E', foreground: '#0A2947' },
        success: { DEFAULT: '#2F7D5B', foreground: '#ffffff' },
        destructive: { DEFAULT: '#B4412F', foreground: '#ffffff' },
        muted: { DEFAULT: '#F4F1EB', foreground: '#5E6470' },
        card: { DEFAULT: '#ffffff', foreground: '#0F1B2A' },
        popover: { DEFAULT: '#ffffff', foreground: '#0F1B2A' },
        input: '#E3DED4',
        ring: '#C08F5E',
      },
      borderRadius: { lg: '10px', md: '8px', sm: '6px' },
      fontFamily: { sans: ['Tajawal', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
export default config;
