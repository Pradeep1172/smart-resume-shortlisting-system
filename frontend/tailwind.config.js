/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#F8FAFC',         // Clean SaaS light bg
          panel: '#FFFFFF',      // White cards
          panelLight: '#F1F5F9', // Slate 100 hover state
          border: '#E2E8F0',     // Slate 200 border
          primary: '#2563EB',    // SaaS Blue
          primaryHover: '#1D4ED8',
          secondary: '#06b6d4',  // Teal
          secondaryHover: '#0891b2',
          accent: '#8B5CF6',     // Violet accent
          success: '#10b981',    // Green
          danger: '#ef4444',     // Red
          warning: '#f59e0b',    // Orange
          textPrimary: '#0F172A', // Slate 900 text
          textSecondary: '#64748B', // Slate 500 text
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 30px 0 rgba(0, 0, 0, 0.04)',
        'premium': '0 10px 30px -5px rgba(37, 99, 235, 0.08)',
        'panel': '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
        'glow': '0 0 15px rgba(37, 99, 235, 0.15)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s infinite linear',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        }
      }
    },
  },
  plugins: [],
}
