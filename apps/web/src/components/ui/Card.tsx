import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  header?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ header, children, style, ...props }) => {
  return (
    <div
      style={{
        backgroundColor: '#0d131f',
        border: '3px solid #334155',
        outline: '2px solid #0a0e17',
        borderRadius: '4px',
        padding: '20px',
        boxShadow:
          'inset 0 0 20px rgba(0, 0, 0, 0.9), inset 1px 1px 0 rgba(255, 255, 255, 0.12), 0 8px 24px rgba(0, 0, 0, 0.9)',
        position: 'relative',
        boxSizing: 'border-box',
        ...style,
      }}
      {...props}
    >
      {header && (
        <div
          style={{
            marginBottom: '16px',
            borderBottom: '2px solid #242f42',
            paddingBottom: '12px',
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '0.85rem',
            letterSpacing: '0.06em',
            color: '#f1c40f',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.9)',
          }}
        >
          {header}
        </div>
      )}
      {children}
    </div>
  );
};
