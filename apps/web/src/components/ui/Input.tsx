import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, style, id, ...props }) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        style={{
          backgroundColor: 'var(--bg-primary)',
          border: error ? '1px solid var(--accent-crimson)' : '1px solid var(--border-subtle)',
          borderRadius: '4px',
          padding: '10px 14px',
          color: 'var(--text-primary)',
          fontSize: '1rem',
          outline: 'none',
          ...style,
        }}
        {...props}
      />
      {error && <span style={{ color: 'var(--accent-crimson)', fontSize: '0.8rem' }}>{error}</span>}
    </div>
  );
};
