export default {content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        edge: 'rgb(var(--color-edge) / <alpha-value>)',
        accent: '#F59E0B',
        telemetry: '#38BDF8',
        valid: '#10B981',
        signal: '#EF4444',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Archivo', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 0 1px rgba(56,189,248,0.4), 0 0 18px -2px rgba(56,189,248,0.45)',
        'glow-amber': '0 0 0 1px rgba(245,158,11,0.4), 0 0 18px -2px rgba(245,158,11,0.45)',
        'glow-red': '0 0 0 1px rgba(239,68,68,0.45), 0 0 18px -2px rgba(239,68,68,0.5)',
        'glow-green': '0 0 0 1px rgba(16,185,129,0.4), 0 0 18px -2px rgba(16,185,129,0.4)',
        device: '0 40px 80px -20px rgba(0,0,0,0.8)',
      },
      fontSize: {
        '2xs': ['0.6875rem', '0.95rem'],
      },
    },
  },
}
