/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB', // Vibrant Blue 600
          hover: '#1D4ED8',   // Deep Blue 700
          light: '#EFF6FF',   // Light Blue 50
          muted: '#DBEAFE',   // Soft Blue 100
          dark: '#1E40AF',    // Royal Blue 800
        },
        secondary: '#0284C7', // Sky 600
        stroke: '#E2E8F0',
        strokedark: '#CBD5E1',
        boxdark: '#FFFFFF',
        'boxdark-2': '#F8FAFC',
        success: '#16A34A',
        warning: '#D97706',
        danger: '#DC2626',
        info: '#2563EB',
        meta: {
          1: '#DC2626',
          2: '#F1F5F9',
          3: '#16A34A',
          4: '#E2E8F0',
          5: '#2563EB',
          6: '#D97706',
          7: '#DC2626',
          8: '#D97706',
          9: '#F8FAFC',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'Courier New', 'monospace'],
      },
      spacing: {
        '4.5': '1.125rem',
        '5.5': '1.375rem',
        '6.5': '1.625rem',
        '7.5': '1.875rem',
        '8.5': '2.125rem',
        '9.5': '2.375rem',
        '10.5': '2.625rem',
        '11.5': '2.875rem',
      },
      dropShadow: {
        1: '0px 1px 2px rgba(0, 0, 0, 0.05)',
        2: '0px 2px 4px rgba(0, 0, 0, 0.08)',
      },
      boxShadow: {
        DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'default': '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'card-2': '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        'glow-primary': '0 0 15px rgba(37, 99, 235, 0.2)',
      },
      borderRadius: {
        'sm': '4px',
        'DEFAULT': '6px',
        'md': '8px',
        'lg': '10px',
        'xl': '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
}
