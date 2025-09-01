/**
 * Tailwind v4 config is optional. We expose tokens for clarity
 * and to allow editor intellisense for custom colors.
 */
export default {
  theme: {
    extend: {
      colors: {
        ges: {
          primary: 'var(--ges-primary)',
          'primary-600': 'var(--ges-primary-600)',
          accent: 'var(--ges-accent)',
          muted: 'var(--ges-muted)',
          bg: 'var(--ges-bg)',
          panel: 'var(--ges-panel)',
          border: 'var(--ges-border)',
        },
      },
      borderRadius: {
        '2xl': '1rem',
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      },
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '1.5rem',
          lg: '2rem',
        },
      },
    },
  },
};

