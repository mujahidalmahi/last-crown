import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  header?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ header, children, style, ...props }) => {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '6px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
        ...style,
      }}
      {...props}
    >
      {header && (
        <div
          style={{
            marginBottom: '16px',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '12px',
          }}
        >
          {header}
        </div>
      )}
      {children}
    </div>
  );
};
