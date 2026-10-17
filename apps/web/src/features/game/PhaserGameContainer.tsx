'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Room } from 'colyseus.js';
import { BattleRoomState } from '@last-crown/shared';
import { GameBootstrap } from '../../game/bootstrap/GameBootstrap';
import { GameSimulationSnapshot } from '@last-crown/game-core';
import { VoiceChatState } from '../voice/useVoiceChat';
import { GameHUD } from './GameHUD';
import { MobileGameControls } from './MobileGameControls';
import {
  requestBrowserFullscreen,
  exitBrowserFullscreen,
  isBrowserFullscreen,
} from '../../utils/fullscreen';

export interface PhaserGameContainerProps {
  mode?: 'singleplayer' | 'multiplayer' | 'local_multiplayer';
  playerPreset?: string;
  opponentPreset?: string;
  arenaId?: string;
  colyseusRoom?: Room<BattleRoomState>;
  voiceState?: VoiceChatState;
  onRematch?: () => void;
  onExit?: () => void;
}

export const PhaserGameContainer: React.FC<PhaserGameContainerProps> = ({
  mode = 'singleplayer',
  playerPreset = 'knight',
  opponentPreset = 'knight',
  arenaId = 'coloseum',
  colyseusRoom,
  voiceState,
  onRematch,
  onExit,
}) => {
  const router = useRouter();
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bootstrapRef = useRef<GameBootstrap | null>(null);
  const [snapshot, setSnapshot] = useState<GameSimulationSnapshot | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFadingIn, setIsFadingIn] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isTouchMobile, setIsTouchMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  // Detect mobile touch device and attempt landscape lock
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const check = () => {
      const isCoarse =
        window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
      const hasTouch =
        (navigator.maxTouchPoints > 0 && isCoarse) || ('ontouchstart' in window && isCoarse);
      setIsTouchMobile(Boolean(hasTouch));
      setIsPortrait(Boolean(hasTouch && window.innerHeight > window.innerWidth));
      setTimeout(() => bootstrapRef.current?.refreshScale(), 120);
    };

    check();

    // Try to lock to landscape on mobile — ignore if not supported
    if (typeof screen !== 'undefined' && screen.orientation && 'lock' in screen.orientation) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (screen.orientation as any).lock('landscape').catch(() => {
        /* Silently ignore — not all browsers allow this */
      });
    }

    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
      // Release orientation lock on unmount
      if (typeof screen !== 'undefined' && screen.orientation && 'unlock' in screen.orientation) {
        try {
          screen.orientation.unlock();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFadingIn(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleTogglePause = useCallback(() => {
    if (mode !== 'singleplayer') return;
    setIsPaused(prev => {
      const next = !prev;
      if (bootstrapRef.current) {
        bootstrapRef.current.setPaused(next);
      }
      return next;
    });
  }, [mode]);

  const handleRematch = useCallback(() => {
    setIsPaused(false);
    if (bootstrapRef.current) {
      bootstrapRef.current.setPaused(false);
      bootstrapRef.current.rematch();
    }
    if (onRematch) {
      onRematch();
    }
  }, [onRematch]);

  const handleExit = useCallback(() => {
    if (onExit) {
      onExit();
    } else {
      router.push('/');
    }
  }, [onExit, router]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (isBrowserFullscreen()) {
        await exitBrowserFullscreen();
      } else {
        await requestBrowserFullscreen(document.documentElement);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Fullscreen state listener & auto-fullscreen on entry
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(isBrowserFullscreen());
      setTimeout(() => {
        bootstrapRef.current?.refreshScale();
      }, 100);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // Initial check
    setIsFullscreen(isBrowserFullscreen());

    // Auto-enter fullscreen upon entering any game mode
    const autoEnterFullscreen = async () => {
      try {
        if (!isBrowserFullscreen()) {
          await requestBrowserFullscreen(document.documentElement);
        }
      } catch {
        // Handled by user gesture listener
      }
    };
    autoEnterFullscreen();

    // 'F' key toggles fullscreen
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyF') {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        toggleFullscreen();
      }
    };

    // Initial user gesture enters fullscreen if not already
    const handleInitialGesture = async () => {
      if (!isBrowserFullscreen()) {
        try {
          await requestBrowserFullscreen(document.documentElement);
        } catch {
          // Handled gracefully
        }
      }
    };

    window.addEventListener('pointerdown', handleInitialGesture, { once: true });
    window.addEventListener('keydown', handleKeyDown);

    // Window resize observer to ensure Phaser scale is always synchronized
    const handleResize = () => {
      setIsFullscreen(isBrowserFullscreen());
      bootstrapRef.current?.refreshScale();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      window.removeEventListener('pointerdown', handleInitialGesture);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [toggleFullscreen]);

  useEffect(() => {
    if (mode !== 'singleplayer') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        handleTogglePause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, handleTogglePause]);

  useEffect(() => {
    // Client-side guard: do not run in Node/SSR environment
    if (typeof window === 'undefined' || !containerRef.current) return;

    const bootstrap = new GameBootstrap();
    bootstrapRef.current = bootstrap;

    let lastSnapEmitTime = 0;
    let lastRound = -1;
    let lastMatchState = '';
    let lastWinnerId: string | null = null;
    let lastP1Exhausted = false;
    let lastP2Exhausted = false;

    bootstrap.initialize(containerRef.current, {
      mode,
      playerPreset,
      opponentPreset,
      arenaId,
      colyseusRoom,
      onSnapshot: (snap: GameSimulationSnapshot) => {
        if (!isLoaded) setIsLoaded(true);

        const now = performance.now();
        const isCriticalChange =
          snap.matchState !== lastMatchState ||
          snap.roundNumber !== lastRound ||
          snap.winnerId !== lastWinnerId ||
          snap.p1.isDecapitated ||
          snap.p2.isDecapitated ||
          snap.p1.isExhausted !== lastP1Exhausted ||
          snap.p2.isExhausted !== lastP2Exhausted;

        // Throttle React state reconciler to 60 FPS (every ~16ms) to eliminate React fiber
        // overhead from the main thread, leaving 100% of GPU & CPU frame budget for 144Hz WebGL!
        if (isCriticalChange || now - lastSnapEmitTime >= 16) {
          lastSnapEmitTime = now;
          lastMatchState = snap.matchState;
          lastRound = snap.roundNumber;
          lastWinnerId = snap.winnerId;
          lastP1Exhausted = snap.p1.isExhausted;
          lastP2Exhausted = snap.p2.isExhausted;
          setSnapshot(snap);
        }
      },
    });

    return () => {
      bootstrap.destroy();
      bootstrapRef.current = null;
    };
  }, [mode, playerPreset, opponentPreset, arenaId, colyseusRoom]);

  return (
    <div
      ref={fullscreenContainerRef}
      id="last-crown-fullscreen-viewport"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100dvw',
        height: '100dvh',
        backgroundColor: '#050810',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* 16:9 Aspect Ratio Arena Stage: fills screen in landscape or sits at top 44vh in portrait */}
      <div
        style={{
          position: 'relative',
          width: 'min(100dvw, calc(100dvh * (16 / 9)))',
          height: 'min(100dvh, calc(100dvw * (9 / 16)))',
          maxWidth: '100%',
          maxHeight: '100%',
          aspectRatio: '16 / 9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.95)',
          flexShrink: 0,
        }}
      >
        <div
          id="phaser-game-canvas-root"
          ref={containerRef}
          style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
        />
        <GameHUD
          snapshot={snapshot}
          mode={mode}
          colyseusRoom={colyseusRoom}
          voiceState={voiceState}
          onRematch={handleRematch}
          onExit={handleExit}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          isPaused={isPaused}
          onTogglePause={handleTogglePause}
        />

        {/* Floating prompt if browser was opened in windowed mode */}
        {!isFullscreen && (
          <button
            type="button"
            onClick={toggleFullscreen}
            style={{
              position: 'absolute',
              top: 'clamp(54px, 11vh, 80px)',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 150,
              backgroundColor: '#0a0e16',
              color: '#f1c40f',
              border: '2px solid #f1c40f',
              borderRadius: '4px',
              padding: '8px 18px',
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 'clamp(0.55rem, 1.2vw, 0.72rem)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow:
                'inset 0 -3px 0 rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 4px 0 #000, 0 0 18px rgba(241, 196, 15, 0.55)',
              pointerEvents: 'auto',
              maxWidth: '92%',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <img
                src="/icon.png"
                alt=""
                width={16}
                height={16}
                style={{ imageRendering: 'pixelated' }}
              />
              <span>ENTER FULL SCREEN [F]</span>
              <img
                src="/icon.png"
                alt=""
                width={16}
                height={16}
                style={{ imageRendering: 'pixelated' }}
              />
            </span>
          </button>
        )}

        {/* Cinematic Fade-In Curtain */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#050810',
            zIndex: 50,
            pointerEvents: 'none',
            opacity: isFadingIn ? 1 : 0,
            transition: 'opacity 0.75s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          aria-hidden="true"
        />

        {/* Portrait warning overlay — shown only when orientation lock failed */}
        {isTouchMobile && isPortrait && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(5, 8, 16, 0.93)',
              zIndex: 500,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              pointerEvents: 'auto',
            }}
          >
            <span style={{ fontSize: '3rem' }}>📱</span>
            <p
              style={{
                color: '#f1c40f',
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 'clamp(0.65rem, 3vw, 0.9rem)',
                textAlign: 'center',
                padding: '0 24px',
                lineHeight: 1.8,
              }}
            >
              ROTATE PHONE
              <br />
              SIDEWAYS TO PLAY
            </p>
          </div>
        )}

        {/* Touch game controls — overlaid directly on the arena canvas */}
        {isTouchMobile && <MobileGameControls isPortrait={false} />}
      </div>
    </div>
  );
};
