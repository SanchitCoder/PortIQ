/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        cormorant: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        gold: {
          DEFAULT: '#C9A84C',
          50:  '#FDF8EC',
          100: '#F8ECC8',
          200: '#F0D48E',
          300: '#E8BC54',
          400: '#D4A030',
          500: '#C9A84C',
          600: '#A8872C',
          700: '#7A5E18',
          800: '#4E3A08',
          900: '#2A1D02',
        },
        obsidian: {
          950: '#03050C',
          900: '#04060D',
          800: '#060810',
          700: '#080B18',
          600: '#0C1025',
          500: '#111730',
        },
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #E8C96B 0%, #C9A84C 50%, #9A7A2E 100%)',
        'gold-gradient-h': 'linear-gradient(90deg, #E8C96B 0%, #C9A84C 100%)',
        'glass-shine': 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 60%)',
      },
      animation: {
        'fade-up':        'fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) forwards',
        'fade-in':        'fadeIn 0.6s ease forwards',
        'slide-right':    'slideRight 0.7s cubic-bezier(0.16,1,0.3,1) forwards',
        'slide-left':     'slideLeft 0.7s cubic-bezier(0.16,1,0.3,1) forwards',
        'float':          'float 7s ease-in-out infinite',
        'float-slow':     'float 10s ease-in-out infinite',
        'gold-pulse':     'goldPulse 3s ease-in-out infinite',
        'shimmer':        'shimmer 2.5s linear infinite',
        'orb-1':          'orb1 12s ease-in-out infinite',
        'orb-2':          'orb2 15s ease-in-out infinite',
        'orb-3':          'orb3 10s ease-in-out infinite',
        'spin-slow':      'spin 4s linear infinite',
        'scale-in':       'scaleIn 0.6s cubic-bezier(0.16,1,0.3,1) forwards',
        'ticker':         'ticker 20s linear infinite',
        'blob':           'blob 8s ease-in-out infinite',
        'gradient':       'gradient 8s ease infinite',
        'fade-in-up':     'fadeInUp 0.6s ease-out',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(28px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideRight: {
          '0%':   { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideLeft: {
          '0%':   { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-14px)' },
        },
        goldPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(201,168,76,0)' },
          '50%':      { boxShadow: '0 0 40px 8px rgba(201,168,76,0.15)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        orb1: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%':      { transform: 'translate(50px, -70px) scale(1.15)' },
          '66%':      { transform: 'translate(-30px, 40px) scale(0.85)' },
        },
        orb2: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '40%':      { transform: 'translate(-60px, 50px) scale(1.2)' },
          '70%':      { transform: 'translate(40px, -30px) scale(0.9)' },
        },
        orb3: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%':      { transform: 'translate(30px, 60px) scale(1.1)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        ticker: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        blob: {
          '0%':   { transform: 'translate(0px, 0px) scale(1)' },
          '33%':  { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%':  { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
      },
      backdropBlur: {
        '4xl': '72px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
