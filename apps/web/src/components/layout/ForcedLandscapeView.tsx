'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { requestLandscapeOrientation } from '../../utils/fullscreen';
import styles from './ForcedLandscapeView.module.css';

interface ForcedLandscapeViewProps {
  children: React.ReactNode;
}

export const ForcedLandscapeView: React.FC<ForcedLandscapeViewProps> = ({ children }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [isFlipped, setIsFlipped] = useState(false);

  const evaluateOrientation = useCallback(() => {
    if (typeof window === 'undefined') return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const isCoarse =
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
      (window.matchMedia && window.matchMedia('(hover: none)').matches) ||
      Boolean(navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
      'ontouchstart' in window;

    // Matches mobile phones & tablets (up to 1024px width or height with touch capability)
    const isMobileTablet = Boolean(isCoarse && (width <= 1024 || height <= 1024));
    const portrait = Boolean(isMobileTablet && height > width);

    setIsMobileOrTablet(isMobileTablet);
    setIsPortrait(portrait);
    setViewportSize({ width, height });
  }, []);

  useEffect(() => {
    setIsMounted(true);
    evaluateOrientation();

    // Lock screen orientation to landscape if the device/browser supports the Screen Orientation API
    const tryLockOrientation = () => {
      requestLandscapeOrientation().catch(() => {});
    };
    tryLockOrientation();

    window.addEventListener('resize', evaluateOrientation);
    window.addEventListener('orientationchange', evaluateOrientation);
    window.addEventListener('pointerdown', tryLockOrientation, { once: true });

    return () => {
      window.removeEventListener('resize', evaluateOrientation);
      window.removeEventListener('orientationchange', evaluateOrientation);
      window.removeEventListener('pointerdown', tryLockOrientation);
    };
  }, [evaluateOrientation]);

  // If not mounted yet (SSR) or on desktop view: render children untouched!
  if (!isMounted || !isMobileOrTablet) {
    return <>{children}</>;
  }

  // Mobile / Tablet in Portrait: FORCE LANDSCAPE via 90-degree rotated viewport
  if (isPortrait) {
    const targetWidth =
      viewportSize.height || (typeof window !== 'undefined' ? window.innerHeight : 844);
    const targetHeight =
      viewportSize.width || (typeof window !== 'undefined' ? window.innerWidth : 390);

    return (
      <div
        className={styles.forcedLandscapeActive}
        style={{
          width: `${targetWidth}px`,
          height: `${targetHeight}px`,
          transform: isFlipped
            ? 'rotate(-90deg) translateX(-100%)'
            : 'rotate(90deg) translateY(-100%)',
        }}
      >
        {children}
        <button
          type="button"
          className={styles.flipBtn}
          onClick={e => {
            e.stopPropagation();
            setIsFlipped(prev => !prev);
          }}
          title="Flip Landscape 180°"
          aria-label="Flip Landscape 180°"
        >
          🔄
        </button>
      </div>
    );
  }

  // Mobile / Tablet already in Landscape: render in natural full-viewport landscape container
  return <div className={styles.naturalLandscapeWrapper}>{children}</div>;
};
