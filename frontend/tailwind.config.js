/** @type {import('tailwindcss').Config} */

module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Add custom IDE-like colors
        'ide-bg': '#1e1e1e',        // Main background
        'ide-sidebar': '#252526',    // Sidebar background
        'ide-active': '#2d2d2d',     // Active item background
        'ide-hover': '#2c2c2c',      // Hover state
        'ide-border': '#3c3c3c',     // Border color
        'ide-text': '#cccccc',       // Main text color
        'ide-text-dim': '#8c8c8c',   // Secondary text
        'ide-accent': '#0e639c',     // Accent color (VS Code blue)
        'ide-error': '#f14c4c',      // Error colors
        'ide-success': '#4ec9b0',    // Success/confirmation color
      },
      fontFamily: {
        'mono': ['Consolas', 'Monaco', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'ide': '0 2px 8px rgba(0, 0, 0, 0.3)',
      },
      spacing: {
        'ide-icon': '1.25rem',       // Standard icon size
        'ide-indent': '1.5rem',      // Indentation size
      },
    },
  },
  plugins: [
    // Scrollbar hiding
    function ({ addUtilities }) {
      const newUtilities = {
        '.hide-scrollbar': {
          'scrollbar-width': 'none',
          '-ms-overflow-style': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
      }
      addUtilities(newUtilities);
    },

    // Custom IDE-like scrollbars for places where you do want scrollbars
    function ({ addUtilities }) {
      const newUtilities = {
        '.ide-scrollbar': {
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#1e1e1e',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#424242',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#4f4f4f',
          },
          'scrollbar-width': 'thin',
          'scrollbar-color': '#424242 #1e1e1e',
        }
      }
      addUtilities(newUtilities);
    },

    // Add utility for code editor line highlighting
    function ({ addUtilities }) {
      const newUtilities = {
        '.ide-line-highlight': {
          'background-color': 'rgba(255, 255, 255, 0.07)',
        }
      }
      addUtilities(newUtilities);
    }
  ],
};

