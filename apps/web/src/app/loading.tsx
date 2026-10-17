import React from 'react';

export default function Loading() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '20px',
        fontFamily: "'Press Start 2P', monospace",
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: '2.5rem',
          filter: 'drop-shadow(0 0 12px #f1c40f)',
          animation: 'pixelBounce 0.6s steps(4) infinite alternate',
        }}
      >
        ⚔️
      </div>
      <p
        style={{
          color: '#f1c40f',
          fontSize: '0.75rem',
          letterSpacing: '0.12em',
          textShadow:
            '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 3px 0 #000',
          animation: 'pixelBlink 0.9s steps(2) infinite',
        }}
      >
        ENTERING THE ARENA...
      </p>
      <style>{`
        @keyframes pixelBounce {
          0% { transform: translateY(0); }
          100% { transform: translateY(-8px); }
        }
        @keyframes pixelBlink {
          0% { opacity: 1; }
          50% { opacity: 0.35; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
