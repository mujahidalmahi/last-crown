'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PixelButton } from '../components/ui/PixelButton';
import { ArenaSelectModal } from '../components/arena/ArenaSelectModal';
import { requestBrowserFullscreen, isBrowserFullscreen } from '../utils/fullscreen';
import styles from './page.module.css';

type Screen = 'cover1' | 'transition' | 'cover2';

export default function HomePage() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('cover1');
  const [isFadingToGame, setIsFadingToGame] = useState(false);
  const [isArenaModalOpen, setIsArenaModalOpen] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'reverse'>('forward');
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener?.('change', handler);
    return () => mediaQuery.removeEventListener?.('change', handler);
  }, []);

  useEffect(() => {
    const handleInitialGesture = async () => {
      try {
        if (!isBrowserFullscreen()) {
          await requestBrowserFullscreen();
        }
      } catch {
        // Handled gracefully
      }
    };
    window.addEventListener('pointerdown', handleInitialGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleInitialGesture);
    };
  }, []);

  const handlePlayClick = useCallback(async () => {
    try {
      await requestBrowserFullscreen();
    } catch {
      // Handled gracefully
    }
    if (reducedMotion) {
      setScreen('cover2');
      return;
    }
    setTransitionDirection('forward');
    setScreen('transition');
    setTimeout(() => setScreen('cover2'), 800);
  }, [reducedMotion]);

  const handleSettingsClick = useCallback(async () => {
    try {
      await requestBrowserFullscreen();
    } catch {
      // Handled gracefully
    }
    setIsFadingToGame(true);
    setTimeout(() => {
      router.push('/settings');
    }, 450);
  }, [router]);

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
          PLAY
        </PixelButton>
        <PixelButton size="lg" onClick={handleSettingsClick} className={styles.mainButton}>
          SETTINGS
        </PixelButton>
      </div>
    </div>
  );

  const handleModeClick = useCallback(
    async (destination: string) => {
      try {
        await requestBrowserFullscreen();
      } catch {
        // Handled gracefully
      }
      setIsFadingToGame(true);
      setTimeout(() => {
        router.push(destination);
      }, 500);
    },
    [router]
  );

  const handleSelectArena = useCallback(
    (arenaId: string) => {
      setIsArenaModalOpen(false);
      handleModeClick(`/play?arena=${arenaId}`);
    },
    [handleModeClick]
  );

  const renderCover2 = () => (
    <div className={styles.coverContainer} role="region" aria-label="Game modes">
      <div className={styles.buttonGroup}>
        <PixelButton
          size="lg"
          onClick={() => setIsArenaModalOpen(true)}
          className={styles.modeButton}
        >
          BATTLE AI WARRIOR
        </PixelButton>
        <PixelButton
          size="lg"
          onClick={() => handleModeClick('/local')}
          className={styles.modeButton}
        >
          LOCAL 2-PLAYER (CONTROLLERS &amp; QR)
        </PixelButton>
        <PixelButton
          size="lg"
          onClick={() => handleModeClick('/room')}
          className={styles.modeButton}
        >
          ONLINE 2-PLAYER ROOM
        </PixelButton>
        <PixelButton
          size="md"
          onClick={handleBackToCover1}
          variant="danger"
          className={styles.backButton}
        >
          BACK
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

      {/* Semantic Search Engine Crawler & Screen Reader Content */}
      <article className="sr-only">
        <h1>Last-Crown: The winner takes it all — Free Retro Pixel-Art Browser Fighting Game</h1>
        <p>
          Welcome to Last-Crown: The winner takes it all (https://last-crown.top), the premier free
          retro pixel-art browser fighting game. Experience intense 2D combat featuring
          server-authoritative physics, parrying mechanics, tactical stamina management, and dynamic
          retro CRT arcade visuals. Play instantly with zero downloads on desktop, tablet, and
          mobile devices.
        </p>

        <h2>Game Modes in Last Crown</h2>
        <section>
          <h3>Single-Player AI Duel</h3>
          <p>
            Challenge smart bot warriors powered by adaptive combat AI across 4 unique medieval
            arenas: Colosseum, Mossy Castle, Emerald Fortress, and Royal Chamber. Perfect your sword
            timing, dash evasion, and combo chains.
          </p>
        </section>

        <section>
          <h3>Local 2-Player Couch Multiplayer (Mobile QR Controllers &amp; Gamepads)</h3>
          <p>
            Battle your friends on a single device! Scan the on-screen QR code with any smartphone
            to instantly transform it into a responsive wireless touch controller, or plug in
            standard USB and Bluetooth gamepads for authentic retro arcade couch battles.
          </p>
        </section>

        <section>
          <h3>Online 1v1 Multiplayer with Real-Time WebRTC Voice Chat</h3>
          <p>
            Host or join private matches with 6-character room codes. Compete against rivals
            worldwide backed by Colyseus state synchronization, rollback anti-cheat netcode, and
            crystal-clear WebRTC voice communication.
          </p>
        </section>

        <h2>Combat Moves &amp; Controls Guide</h2>
        <ul>
          <li>Movement: A / D or Left / Right Arrows (Dash with C / E)</li>
          <li>Jump &amp; Crouch: W / S or Up / Down Arrows</li>
          <li>Light Slash Attack: J key or Spacebar</li>
          <li>Heavy Execution Strike: K key</li>
          <li>Forward Thrust: L or U key</li>
          <li>Low Sweep Kick: Down + Attack</li>
          <li>Shield Block: I key</li>
          <li>Parry Window: Precise counter-timing to stagger attackers</li>
        </ul>
      </article>

      {/* Map / Arena Selection Modal */}
      <ArenaSelectModal
        isOpen={isArenaModalOpen}
        onSelect={handleSelectArena}
        onClose={() => setIsArenaModalOpen(false)}
        title="SELECT ARENA"
      />

      {/* Fade Out Curtain for Mode Selection */}
      <div
        className={`${styles.fadeOverlay} ${isFadingToGame ? styles.fadeOverlayActive : ''}`}
        aria-hidden="true"
      />

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap');
      `}</style>
    </div>
  );
}
