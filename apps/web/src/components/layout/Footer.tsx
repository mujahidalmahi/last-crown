import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '24px',
        textAlign: 'center',
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
        marginTop: 'auto',
      }}
    >
      <p>© 2026 LAST CROWN — Only One Shall Reign. Built with Phaser 3, Colyseus & Next.js.</p>
    </footer>
  );
};
