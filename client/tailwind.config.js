/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      // Apple-inspired color palette - Minimalismo con propósito
      colors: {
        // Primary - Azul Apple confiable y profesional
        primary: {
          50: '#f0f7ff',
          100: '#e0efff',
          200: '#b9dfff',
          300: '#7cc4ff',
          400: '#36a5ff',
          500: '#0a84ff', // Apple Blue
          600: '#0066cc',
          700: '#0055b3',
          800: '#004494',
          900: '#003775',
        },
        // Neutral - Escala de grises Apple
        neutral: {
          50: '#fafafa',
          100: '#f5f5f7', // Apple Light Gray
          200: '#e8e8ed',
          300: '#d2d2d7',
          400: '#aeaeb2',
          500: '#8e8e93',
          600: '#636366',
          700: '#48484a',
          800: '#3a3a3c',
          900: '#2c2c2e',
          950: '#1c1c1e', // Apple Dark
        },
        // Success - Verde armónico
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#30d158', // Apple Green
          600: '#22c55e',
          700: '#16a34a',
          800: '#166534',
          900: '#14532d',
        },
        // Warning - Naranja suave
        warning: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#ff9f0a', // Apple Orange
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        // Danger - Rojo Apple
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ff453a', // Apple Red
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        // Surface colors para cards y fondos
        surface: {
          primary: '#ffffff',
          secondary: '#f5f5f7',
          tertiary: '#e8e8ed',
          elevated: '#ffffff',
        },
      },
      // Tipografía - SF Pro inspirada
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'SF Pro Text',
          'Helvetica Neue',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'SF Mono',
          'Monaco',
          'Inconsolata',
          'Fira Mono',
          'Droid Sans Mono',
          'Source Code Pro',
          'monospace',
        ],
      },
      // Tamaños de fuente con line-height optimizado
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '-0.01em' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '-0.01em' }],
        'base': ['1rem', { lineHeight: '1.5rem', letterSpacing: '-0.011em' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.014em' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.017em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.019em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.021em' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.022em' }],
        '5xl': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.024em' }],
      },
      // Espaciado - Sistema de 4pt
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
        '22': '5.5rem',
      },
      // Border radius - Curvas suaves Apple
      borderRadius: {
        'apple': '0.625rem', // 10px - Apple standard
        'apple-lg': '0.875rem', // 14px
        'apple-xl': '1.25rem', // 20px
        'apple-2xl': '1.5rem', // 24px
        'apple-3xl': '2rem', // 32px
      },
      // Sombras - Elevación sutil y realista
      boxShadow: {
        'apple-sm': '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'apple': '0 2px 8px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 0, 0.04)',
        'apple-md': '0 4px 12px rgba(0, 0, 0, 0.05), 0 8px 24px rgba(0, 0, 0, 0.05)',
        'apple-lg': '0 8px 24px rgba(0, 0, 0, 0.06), 0 16px 48px rgba(0, 0, 0, 0.06)',
        'apple-xl': '0 16px 48px rgba(0, 0, 0, 0.08), 0 24px 64px rgba(0, 0, 0, 0.08)',
        'apple-inner': 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
        'apple-glow': '0 0 0 4px rgba(10, 132, 255, 0.15)',
      },
      // Transiciones - Curvas de animación Apple
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        'apple-spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'apple-ease-out': 'cubic-bezier(0, 0, 0.58, 1)',
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '450': '450ms',
      },
      // Animaciones
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      // Backdrop blur para efectos de vidrio
      backdropBlur: {
        'apple': '20px',
        'apple-lg': '40px',
      },
    },
  },
  plugins: [],
}
