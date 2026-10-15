'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PixelButton } from '../components/ui/PixelButton';
import { SettingsIcon } from '../components/ui/SettingsIcon';
import styles from './page.module.css';

type Screen = 'cover1' | 'transition' | 'cover2';

export default function HomePage() {
  const [screen, setScreen] = useState<Screen>('cover1');
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'reverse'>('forward');
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener?.('change', handler);
    return () => mediaQuery.removeEventListener?.('change', handler);
  }, []);

  const handlePlayClick = useCallback(() => {
    if (reducedMotion) {
      setScreen('cover2');
      return;
    }
    setTransitionDirection('forward');
    setScreen('transition');
    setTimeout(() => setScreen('cover2'), 800);
  }, [reducedMotion]);

  const handleSettingsClick = useCallback(() => {
    window.location.href = '/settings';
  }, []);

  const handleBackToCover1 = useCallback(() => {
    if (reducedMotion) {
      setScreen('cover1');
      return;
    }
    setTransitionDirection('reverse');
    setScreen('transition');
    setTimeout(() => setScreen('cover1'), 800);
  }, [reducedMotion]);

  const renderCover1 = () => (
    <div className={styles.coverContainer} role="region" aria-label="Main menu">
      <div className={styles.buttonGroup}>
        <PixelButton size="lg" onClick={handlePlayClick} className={styles.mainButton}>
          Play
        </PixelButton>
        <PixelButton size="lg" onClick={handleSettingsClick} className={styles.mainButton}>
          Settings
        </PixelButton>
      </div>
    </div>
  );

  const renderCover2 = () => (
    <div className={styles.coverContainer} role="region" aria-label="Game modes">
      <SettingsIcon onClick={handleSettingsClick} className={styles.settingsIconTopRight} />
      <div className={styles.buttonGroup}>
        <PixelButton
          size="lg"
          onClick={() => (window.location.href = '/play')}
          className={styles.modeButton}
        >
          BATTLE AI WARRIOR
        </PixelButton>
        <PixelButton
          size="lg"
          onClick={() => (window.location.href = '/room')}
          className={styles.modeButton}
        >
          Private 2 Player Room
        </PixelButton>
        <PixelButton size="lg" onClick={handleSettingsClick} className={styles.modeButton}>
          Controls & Records
        </PixelButton>
        <PixelButton
          size="md"
          onClick={handleBackToCover1}
          variant="danger"
          className={styles.backButton}
        >
          Back
        </PixelButton>
      </div>
    </div>
  );

  const renderTransition = () => {
    const isForward = transitionDirection === 'forward';
    return (
      <div className={styles.transitionWrapper} aria-hidden="true">
        <div
          className={`${styles.transitionLayer} ${styles.cover1Layer} ${isForward ? styles.slideOutLeft : styles.slideInRight}`}
        >
          <div className={styles.cover1Image} />
        </div>
        <div
          className={`${styles.transitionLayer} ${styles.cover2Layer} ${isForward ? styles.slideInFromRight : styles.slideOutToRight}`}
        >
          <div className={styles.cover2Image} />
        </div>
      </div>
    );
  };

  return (
    <div className={styles.pageWrapper}>
      <div
        className={`${styles.backgroundLayer} ${screen === 'cover1' ? styles.visible : ''} ${screen === 'transition' && transitionDirection === 'reverse' ? styles.visible : ''}`}
      >
        <div className={styles.cover1Image} />
      </div>
      <div
        className={`${styles.backgroundLayer} ${screen === 'cover2' ? styles.visible : ''} ${screen === 'transition' && transitionDirection === 'forward' ? styles.visible : ''}`}
      >
        <div className={styles.cover2Image} />
      </div>

      {screen === 'cover1' && renderCover1()}
      {screen === 'cover2' && renderCover2()}
      {screen === 'transition' && renderTransition()}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap');
      `}</style>
    </div>
  );
}
