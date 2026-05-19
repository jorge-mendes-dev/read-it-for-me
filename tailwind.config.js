/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./popup.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      spacing: {
        'xxs': '0.25rem',
        'xs': '0.5rem',
        'sm': '0.75rem',
        'md': '1rem',
        'lg': '1.5rem',
        'xl': '2rem',
        'xxl': '3rem',
        'section': '6rem',
      },
      colors: {
        canvas: '#010102',
        surface: {
          1: '#141519',
          2: '#1a1c22',
          3: '#21242c',
          4: '#2a2d36',
        },
        hairline: {
          DEFAULT: '#23252a',
          strong: '#2d3038',
          tertiary: '#3a3e48',
        },
        ink: {
          DEFAULT: '#f7f8f8',
          muted: '#d0d6e0',
          subtle: '#8a8f98',
          tertiary: '#62666d',
        },
        primary: {
          DEFAULT: '#5e6ad2',
          hover: '#828fff',
          focus: '#5e69d1',
          secure: '#7a7fad',
        },
        success: '#27a644',
      },
      fontSize: {
        'display-md': ['2.5rem', { lineHeight: '1.15', letterSpacing: '-1px', fontWeight: '600' }],
        'headline': ['1.75rem', { lineHeight: '1.2', letterSpacing: '-0.6px', fontWeight: '600' }],
        'card-title': ['1.375rem', { lineHeight: '1.25', letterSpacing: '-0.4px', fontWeight: '500' }],
        'subhead': ['1.25rem', { lineHeight: '1.4', letterSpacing: '-0.2px', fontWeight: '400' }],
        'body-lg': ['1.125rem', { lineHeight: '1.5', letterSpacing: '-0.1px', fontWeight: '400' }],
        'body': ['1rem', { lineHeight: '1.5', letterSpacing: '-0.05px', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '400' }],
        'caption': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '400' }],
      },
      borderRadius: {
        'xs': '4px',
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        'pill': '9999px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
