import React from 'react';

export interface BadgeProps {
  variant?: 'gold' | 'steel' | 'crimson' | 'green';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'steel', children }) => {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    gold: { bg: '#1c1605', text: '#f1c40f', border: '#d4af37' },
    steel: { bg: '#111827', text: '#cbd5e1', border: '#475569' },
    crimson: { bg: '#2b0b0b', text: '#fca5a5', border: '#ef4444' },
    green: { bg: '#092113', text: '#4ade80', border: '#22c55e' },
  };

  const scheme = colors[variant] || colors.steel!;

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 8px',
        fontFamily: "'Press Start 2P', monospace",
        fontSize: '0.58rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        borderRadius: '3px',
        backgroundColor: scheme.bg,
        color: scheme.text,
        border: `2px solid ${scheme.border}`,
        boxShadow: '0 2px 0 #000',
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.9)',
      }}
    >
      {children}
    </span>
  );
};
