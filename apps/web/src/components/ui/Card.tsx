import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  header?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ header, children, style, ...props }) => {
  return (
    <div
      style={{
        backgroundColor: 'rgba(15, 20, 31, 0.88)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '8px',
        padding: '24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        position: 'relative',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        ...style,
      }}
      {...props}
    >
      {header && (
        <div
          style={{
            marginBottom: '18px',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '14px',
          }}
        >
          {header}
        </div>
      )}
      {children}
    </div>
  );
};
