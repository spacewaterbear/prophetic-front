import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        },
        // Prophetic Design System
        prophetic: {
          brand: {
            primary: '#352ee8',
            'primary-hover': '#2a25ba',
            'primary-muted': 'rgba(53, 46, 232, 0.15)',
          },
          bg: {
            app: '#000000',
            card: '#09090b',
            'card-hover': '#0f0f11',
            elevated: '#18181b',
          },
          border: {
            default: '#18181b',
            subtle: '#27272a',
            emphasis: '#3f3f46',
          },
          text: {
            primary: '#ffffff',
            secondary: '#a1a1aa',
            tertiary: '#71717a',
            muted: '#52525b',
            disabled: '#3f3f46',
          },
          semantic: {
            success: '#22c55e',
            warning: '#f59e0b',
            error: '#ef4444',
            info: '#352ee8',
          },
          data: {
            positive: '#22c55e',
            negative: '#ef4444',
            neutral: '#71717a',
            highlight: '#352ee8',
          },
        },
        // Keep custom for backwards compatibility
        custom: {
          brand: '#352ee8',
          'brand-hover': '#2a25ba'
        },
        // Premium dark theme palette
        zinc: {
          950: '#0a0a0a',
          900: '#18181b',
          800: '#27272a',
          700: '#3f3f46',
          600: '#52525b',
          500: '#71717a',
          400: '#a1a1aa',
        }
      },
      fontFamily: {
        'serif': ['EB Garamond', 'Georgia', 'serif'],
        'sans': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        'mono': ['JetBrains Mono', 'SF Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        // Prophetic design tokens (prefixed to avoid conflicts)
        'prophetic-xs': ['10px', { lineHeight: '1.5' }],
        'prophetic-sm': ['11px', { lineHeight: '1.5' }],
        'prophetic-base': ['13px', { lineHeight: '1.7' }],
        'prophetic-md': ['14px', { lineHeight: '1.5' }],
        'prophetic-lg': ['16px', { lineHeight: '1.5' }],
        'prophetic-xl': ['18px', { lineHeight: '1.5' }],
        'prophetic-2xl': ['24px', { lineHeight: '1.2' }],
        'prophetic-3xl': ['32px', { lineHeight: '1.2' }],
      },
      lineHeight: {
        // Prophetic design tokens
        'prophetic-tight': '1.2',
        'prophetic-base': '1.5',
        'prophetic-relaxed': '1.7',
      },
      letterSpacing: {
        // Prophetic design tokens
        'prophetic-tight': '-0.02em',
        'prophetic-normal': '0',
        'prophetic-wide': '0.1em',
        'prophetic-wider': '0.2em',
      },
      spacing: {
        // Prophetic design tokens (prefixed to avoid conflicts)
        'prophetic-0': '0',
        'prophetic-1': '4px',
        'prophetic-2': '8px',
        'prophetic-3': '12px',
        'prophetic-4': '16px',
        'prophetic-5': '20px',
        'prophetic-6': '24px',
        'prophetic-8': '32px',
        'prophetic-10': '40px',
        'prophetic-12': '48px',
      },
      borderRadius: {
        // Previous config for sidebar and UI components
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        // Prophetic design tokens
        'none': '0',
        'prophetic-sm': '4px',
        'prophetic-md': '8px',
        'prophetic-lg': '14px',
        'prophetic-xl': '16px',
        'full': '9999px',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
        'slow': '300ms',
      },
      transitionTimingFunction: {
        'default': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'in': 'cubic-bezier(0.4, 0, 1, 1)',
        'out': 'cubic-bezier(0, 0, 0.2, 1)',
      },
      maxWidth: {
        'prophetic': '400px',
      },
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '2rem',
          lg: '4rem',
          xl: '5rem',
          '2xl': '6rem',
        },
        screens: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
          '2xl': '1536px',
        },
      },
    }
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
