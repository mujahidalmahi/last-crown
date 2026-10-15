'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Room } from 'colyseus.js';
import { BattleRoomState } from '@last-crown/shared';
import { GameBootstrap } from '../../game/bootstrap/GameBootstrap';
import { GameSimulationSnapshot } from '@last-crown/game-core';
import { GameHUD } from './GameHUD';

export interface PhaserGameContainerProps {
  mode?: 'singleplayer' | 'multiplayer';
  playerPreset?: string;
  opponentPreset?: string;
  arenaId?: string;
  colyseusRoom?: Room<BattleRoomState>;
  onRematch?: () => void;
}

export const PhaserGameContainer: React.FC<PhaserGameContainerProps> = ({
  mode = 'singleplayer',
  playerPreset = 'knight',
  opponentPreset = 'knight',
  arenaId = 'bastion_courtyard',
  colyseusRoom,
  onRematch,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bootstrapRef = useRef<GameBootstrap | null>(null);
  const [snapshot, setSnapshot] = useState<GameSimulationSnapshot | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

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
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '1280px',
        aspectRatio: '16 / 9',
        margin: '0 auto',
        backgroundColor: '#070b12',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
        border: '1px solid var(--border-gold)',
      }}
    >
      <div
        id="phaser-game-canvas-root"
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
      />
      <GameHUD
        snapshot={snapshot}
        mode={mode}
        onRematch={handleRematch}
        isPaused={isPaused}
        onTogglePause={handleTogglePause}
      />
    </div>
  );
};
