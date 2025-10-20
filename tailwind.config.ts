import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Crimson Pro', 'Georgia', 'serif'],
      },
      colors: {
        sage: {
          50: 'hsl(var(--sage-50))',
          100: 'hsl(var(--sage-100))',
          200: 'hsl(var(--sage-200))',
          300: 'hsl(var(--sage-300))',
          400: 'hsl(var(--sage-400))',
          500: 'hsl(var(--sage-500))',
          600: 'hsl(var(--sage-600))',
          700: 'hsl(var(--sage-700))',
          800: 'hsl(var(--sage-800))',
          900: 'hsl(var(--sage-900))',
        },
        'warm-gray': {
          50: 'hsl(var(--warm-gray-50))',
          100: 'hsl(var(--warm-gray-100))',
          200: 'hsl(var(--warm-gray-200))',
          300: 'hsl(var(--warm-gray-300))',
          400: 'hsl(var(--warm-gray-400))',
          500: 'hsl(var(--warm-gray-500))',
          600: 'hsl(var(--warm-gray-600))',
          700: 'hsl(var(--warm-gray-700))',
          800: 'hsl(var(--warm-gray-800))',
          900: 'hsl(var(--warm-gray-900))',
        },
        // NEW: Terracotta palette for affirmative actions
        terracotta: {
          50: 'hsl(var(--terracotta-50))',
          100: 'hsl(var(--terracotta-100))',
          200: 'hsl(var(--terracotta-200))',
          300: 'hsl(var(--terracotta-300))',
          400: 'hsl(var(--terracotta-400))',
          500: 'hsl(var(--terracotta-500))',
          600: 'hsl(var(--terracotta-600))',
          700: 'hsl(var(--terracotta-700))',
          800: 'hsl(var(--terracotta-800))',
          900: 'hsl(var(--terracotta-900))',
        },
        // NEW: Dusty blue palette for analytical sections
        'dusty-blue': {
          50: 'hsl(var(--dusty-blue-50))',
          100: 'hsl(var(--dusty-blue-100))',
          200: 'hsl(var(--dusty-blue-200))',
          300: 'hsl(var(--dusty-blue-300))',
          400: 'hsl(var(--dusty-blue-400))',
          500: 'hsl(var(--dusty-blue-500))',
          600: 'hsl(var(--dusty-blue-600))',
          700: 'hsl(var(--dusty-blue-700))',
          800: 'hsl(var(--dusty-blue-800))',
          900: 'hsl(var(--dusty-blue-900))',
        },
        // UPDATED: Muted gold palette (expanded from single value)
        gold: {
          50: 'hsl(var(--gold-50))',
          100: 'hsl(var(--gold-100))',
          200: 'hsl(var(--gold-200))',
          300: 'hsl(var(--gold-300))',
          400: 'hsl(var(--gold-400))',
          500: 'hsl(var(--gold-500))',
          600: 'hsl(var(--gold-600))',
          700: 'hsl(var(--gold-700))',
          800: 'hsl(var(--gold-800))',
          900: 'hsl(var(--gold-900))',
        },
        coral: 'hsl(var(--coral))',
        sky: 'hsl(var(--sky))',
        lavender: 'hsl(var(--lavender))',
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
      },
      borderRadius: {
        'warmth': '0.75rem',  // NEW: More rounded for elevated surfaces
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // NEW: Soft shadow utilities
      boxShadow: {
        'soft': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'soft-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'soft-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'soft-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-slow': 'fadeIn 0.5s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'skeleton': 'skeleton 2s ease-in-out infinite',
        'breathe': 'breathe 3s ease-in-out infinite',
        'gentle-bounce': 'gentleBounce 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        skeleton: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.02)', opacity: '0.95' },
        },
        gentleBounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
