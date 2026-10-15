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
  const isLong = typeof children === 'string' && children.length > 10;
  const buttonClass = `${styles.pixelButton} ${styles[size]} ${styles[variant]} ${className}`.trim();
  const contentClass = `${styles.buttonContent} ${isLong ? styles.longText : ''}`.trim();

  return (
    <button className={buttonClass} {...props}>
      <span className={contentClass}>{children}</span>
    </button>
  );
};
