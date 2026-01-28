/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Status colors
        status: {
          active: '#22c55e',
          inactive: '#6b7280',
          transitioning: '#eab308',
          error: '#ef4444',
        },
        // AWS-inspired colors
        aws: {
          orange: '#ff9900',
          squid: '#232f3e',
          smile: '#146eb4',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
