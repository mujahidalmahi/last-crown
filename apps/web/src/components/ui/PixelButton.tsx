'use client';

import React from 'react';
import styles from './PixelButton.module.css';

export interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  variant?: 'default' | 'danger';
}

export const PixelButton: React.FC<PixelButtonProps> = ({
  size = 'md',
  className = '',
  children,
  variant = 'default',
  ...props
}) => {
  const buttonClass = `${styles.pixelButton} ${styles[size]} ${styles[variant]} ${className}`;
  return (
    <button className={buttonClass} {...props}>
      <span className={styles.buttonContent}>{children}</span>
      <span className={styles.sparkle} aria-hidden="true" />
    </button>
  );
};