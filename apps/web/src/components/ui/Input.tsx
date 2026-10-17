import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, style, id, ...props }) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '0.65rem',
            fontWeight: 700,
            color: '#f1c40f',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
          }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: '0.72rem',
          backgroundColor: '#070a10',
          border: error ? '2px solid #ef4444' : '2px solid #3d495c',
          outline: 'none',
          borderRadius: '4px',
          padding: '10px 14px',
          color: '#ffffff',
          boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.9), 0 2px 0 #000',
          boxSizing: 'border-box',
          letterSpacing: '0.04em',
          ...style,
        }}
        {...props}
      />
      {error && (
        <span
          style={{
            fontFamily: "'Press Start 2P', monospace",
            color: '#ef4444',
            fontSize: '0.58rem',
            letterSpacing: '0.04em',
            marginTop: '2px',
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
};
