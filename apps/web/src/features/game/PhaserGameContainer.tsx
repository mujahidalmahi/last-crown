'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Room } from 'colyseus.js';
import { BattleRoomState } from '@last-crown/shared';
import { GameBootstrap } from '../../game/bootstrap/GameBootstrap';
import { GameSimulationSnapshot } from '@last-crown/game-core';
import { GameHUD } from './GameHUD';
import {
  requestBrowserFullscreen,
  exitBrowserFullscreen,
  isBrowserFullscreen,
} from '../../utils/fullscreen';

export interface PhaserGameContainerProps {
  mode?: 'singleplayer' | 'multiplayer';
  playerPreset?: string;
  opponentPreset?: string;
  arenaId?: string;
  colyseusRoom?: Room<BattleRoomState>;
  onRematch?: () => void;
  onExit?: () => void;
}

export const PhaserGameContainer: React.FC<PhaserGameContainerProps> = ({
  mode = 'singleplayer',
  playerPreset = 'knight',
  opponentPreset = 'knight',
  arenaId = 'bastion_courtyard',
  colyseusRoom,
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

    // Ensure game enters fullscreen on ANY user interaction (click, tap, keypress)
    const handleUserGesture = async (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      // 'F' key toggles fullscreen
      if (e instanceof KeyboardEvent && e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
        return;
      }

      if (!isBrowserFullscreen()) {
        try {
          await requestBrowserFullscreen(document.documentElement);
        } catch {
          // Handled gracefully
        }
      }
    };

    window.addEventListener('pointerdown', handleUserGesture);
    window.addEventListener('keydown', handleUserGesture);

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
      window.removeEventListener('pointerdown', handleUserGesture);
      window.removeEventListener('keydown', handleUserGesture);
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

    bootstrap.initialize(containerRef.current, {
      mode,
      playerPreset,
      opponentPreset,
      arenaId,
      colyseusRoom,
      onSnapshot: (snap: GameSimulationSnapshot) => {
        setSnapshot(snap);
        if (!isLoaded) setIsLoaded(true);
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
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#050810',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* 16:9 Aspect Ratio Stage: fills screen while preserving 16:9 aspect ratio */}
      <div
        style={{
          position: 'relative',
          width: 'min(100vw, calc(100vh * (16 / 9)))',
          height: 'min(100vh, calc(100vw * (9 / 16)))',
          aspectRatio: '16 / 9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          boxShadow: '0 0 60px rgba(0, 0, 0, 0.95)',
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
              top: '80px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 150,
              backgroundColor: 'rgba(10, 14, 22, 0.92)',
              color: '#f1c40f',
              border: '2px solid var(--border-gold)',
              borderRadius: '24px',
              padding: '8px 24px',
              fontSize: '0.85rem',
              fontWeight: 900,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: '0 0 24px rgba(241, 196, 15, 0.6)',
              pointerEvents: 'auto',
            }}
          >
            ⚔️ CLICK TO ENTER FULL SCREEN [F] ⚔️
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
      </div>
    </div>
  );
};
