'use client';

import React from 'react';
import styles from './SettingsIcon.module.css';

export interface SettingsIconProps {
  onClick: () => void;
  className?: string;
}

export const SettingsIcon: React.FC<SettingsIconProps> = ({ onClick, className = '' }) => {
  return (
    <button
      className={`${styles.settingsIcon} ${className}`}
      onClick={onClick}
      aria-label="Settings"
      title="Settings"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    </button>
  );
};