import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', 'html:not(.light)'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        'bg-elevated': 'var(--bg-elevated)',
        card: 'var(--card)',
        'card-hover': 'var(--card-hover)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        fg: 'var(--fg)',
        'fg-dim': 'var(--fg-dim)',
        'fg-muted': 'var(--fg-muted)',
        'fg-faint': 'var(--fg-faint)',
        bronze: 'var(--bronze)',
        'bronze-soft': 'var(--bronze-soft)',
        'bronze-deep': 'var(--bronze-deep)',
        cyan: 'var(--cyan)',
        'cyan-soft': 'var(--cyan-soft)',
        emerald: 'var(--emerald)',
        rose: 'var(--rose)',
        amber: 'var(--amber)',
        accent: 'var(--accent)',
        good: 'var(--good)',
        bad: 'var(--bad)',
        warn: 'var(--warn)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        panel: 'var(--shadow-panel)',
        'panel-hover': 'var(--shadow-panel-hover)',
        'panel-lifted': 'var(--shadow-panel-lifted)',
        'glow-bronze': 'var(--shadow-glow-bronze)',
        'glow-cyan': 'var(--shadow-glow-cyan)',
      },
    },
  },
  plugins: [],
};

export default config;
