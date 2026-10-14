import React from 'react';

export interface BadgeProps {
  variant?: 'gold' | 'steel' | 'crimson' | 'green';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'steel', children }) => {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    gold: { bg: 'rgba(212, 175, 55, 0.15)', text: '#f1c40f', border: '#d4af37' },
    steel: { bg: 'rgba(74, 85, 104, 0.2)', text: '#cbd5e0', border: '#4a5568' },
    crimson: { bg: 'rgba(197, 48, 48, 0.2)', text: '#fc8181', border: '#e53e3e' },
    green: { bg: 'rgba(46, 204, 113, 0.2)', text: '#2ecc71', border: '#27ae60' },
  };

  const scheme = colors[variant] || colors.steel!;

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        fontSize: '0.75rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        borderRadius: '3px',
        backgroundColor: scheme.bg,
        color: scheme.text,
        border: `1px solid ${scheme.border}`,
      }}
    >
      {children}
    </span>
  );
};
