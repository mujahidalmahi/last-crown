'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { GameSimulationSnapshot } from '@last-crown/game-core';

const PhaserGameContainer = dynamic(
  () =>
    import('../../features/game/PhaserGameContainer').then(mod => mod.PhaserGameContainer),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#050810',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          zIndex: 9999,
        }}
      >
        <img
          src="/icon.png"
          alt="Last-Crown Logo"
          width={64}
          height={64}
          style={{ imageRendering: 'pixelated', filter: 'drop-shadow(0 0 12px #f1c40f)' }}
        />
        <p
          style={{
            fontFamily: "'Press Start 2P', monospace",
            color: '#ffd700',
            fontSize: '0.9rem',
            letterSpacing: '0.12em',
          }}
        >
          PREPARING TRAINING DOJO...
        </p>
      </div>
    ),
  }
);

type DummyBehavior = 'stand' | 'block_all' | 'jump' | 'attack';

export default function TrainingPage() {
  const router = useRouter();
  const [dummyBehavior, setDummyBehavior] = useState<DummyBehavior>('stand');
  const [showHitboxes, setShowHitboxes] = useState<boolean>(true);
  const [dojoKey, setDojoKey] = useState<number>(1);
  const [liveSnapshot, setLiveSnapshot] = useState<GameSimulationSnapshot | null>(null);

  // Track max combo and frame data
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const lastAttackSeenRef = useRef<string | null>(null);

  const handleSnapshot = useCallback(
    (snap: GameSimulationSnapshot) => {
      setLiveSnapshot(snap);
      if (snap.p1.comboCount && snap.p1.comboCount > maxCombo) {
        setMaxCombo(snap.p1.comboCount);
      }
      if (snap.p1.currentAttackId) {
        lastAttackSeenRef.current = snap.p1.currentAttackId;
      }
    },
    [maxCombo]
  );

  const handleResetPositions = () => {
    setDojoKey(prev => prev + 1);
    setMaxCombo(0);
  };

  const p1 = liveSnapshot?.p1;
  const p2 = liveSnapshot?.p2;

  // Frame Advantage estimate: + frames on hit or block
  const isOpponentStunned = (p2?.hitstunRemainingMs ?? 0) > 0;
  const isP1InRecovery = p1?.attackPhase === 'recovery';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#050810',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Top Floating Frame Data & Training HUD */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '16px',
          backgroundColor: 'rgba(7, 11, 18, 0.94)',
          border: '2px solid #00cec9',
          borderRadius: '6px',
          padding: '12px 18px',
          fontFamily: "'Press Start 2P', monospace",
          fontSize: '0.62rem',
          color: '#fff',
          zIndex: 400,
          boxShadow: '0 4px 0 #000, 0 0 16px rgba(0, 206, 201, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          minWidth: '280px',
        }}
      >
        <div style={{ color: '#00cec9', fontSize: '0.72rem', letterSpacing: '0.08em' }}>
          🥋 COMPETITIVE DOJO
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#a4b0be' }}>MOVE:</span>
          <span style={{ color: '#ffd700' }}>{p1?.currentAttackId || 'NEUTRAL'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#a4b0be' }}>PHASE:</span>
          <span
            style={{
              color:
                p1?.attackPhase === 'active'
                  ? '#ff4757'
                  : p1?.attackPhase === 'windup'
                    ? '#ffa502'
                    : p1?.attackPhase === 'recovery'
                      ? '#70a1ff'
                      : '#2ed573',
            }}
          >
            {(p1?.attackPhase || 'NONE').toUpperCase()}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#a4b0be' }}>ADVANTAGE:</span>
          <span style={{ color: isOpponentStunned ? '#2ed573' : isP1InRecovery ? '#ff4757' : '#fff' }}>
            {isOpponentStunned
              ? `+${Math.round((p2?.hitstunRemainingMs ?? 0) / 16)}F`
              : isP1InRecovery
                ? '-F (RECOVERY)'
                : '0F (EVEN)'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#a4b0be' }}>MAX COMBO:</span>
          <span style={{ color: '#ff7f50' }}>{maxCombo} HITS</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#a4b0be' }}>BURST:</span>
          <span style={{ color: (p1?.burstMeter ?? 0) >= 100 ? '#ffd700' : '#d2dae2' }}>
            {p1?.burstMeter ?? 0}/100 PTS
          </span>
        </div>
      </div>

      {/* Top Right Dojo Control Panel */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '16px',
          backgroundColor: 'rgba(7, 11, 18, 0.94)',
          border: '2px solid #f1c40f',
          borderRadius: '6px',
          padding: '12px 18px',
          fontFamily: "'Press Start 2P', monospace",
          fontSize: '0.62rem',
          color: '#fff',
          zIndex: 400,
          boxShadow: '0 4px 0 #000, 0 0 16px rgba(241, 196, 15, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ color: '#ffd700', fontSize: '0.68rem' }}>DUMMY BEHAVIOR</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {(['stand', 'block_all', 'jump', 'attack'] as DummyBehavior[]).map(mode => (
            <button
              key={mode}
              type="button"
              onClick={() => setDummyBehavior(mode)}
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '0.52rem',
                color: dummyBehavior === mode ? '#070b12' : '#fff',
                backgroundColor: dummyBehavior === mode ? '#ffd700' : 'rgba(30, 41, 59, 0.8)',
                border: '1px solid #ffd700',
                borderRadius: '3px',
                padding: '6px 4px',
                cursor: 'pointer',
              }}
            >
              {mode.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={() => setShowHitboxes(prev => !prev)}
            style={{
              flex: 1,
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '0.52rem',
              color: showHitboxes ? '#2ed573' : '#a4b0be',
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              border: `1px solid ${showHitboxes ? '#2ed573' : '#747d8c'}`,
              borderRadius: '3px',
              padding: '6px',
              cursor: 'pointer',
            }}
          >
            HITBOXES: {showHitboxes ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            onClick={handleResetPositions}
            style={{
              flex: 1,
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '0.52rem',
              color: '#fff',
              backgroundColor: '#e67e22',
              border: '1px solid #d35400',
              borderRadius: '3px',
              padding: '6px',
              cursor: 'pointer',
            }}
          >
            RESET
          </button>
        </div>

        <button
          type="button"
          onClick={() => router.push('/game')}
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '0.55rem',
            color: '#fff',
            backgroundColor: '#34495e',
            border: '1px solid #fff',
            borderRadius: '3px',
            padding: '6px',
            cursor: 'pointer',
            marginTop: '2px',
          }}
        >
          EXIT DOJO 🏰
        </button>
      </div>

      {/* Hitbox Visualizer Overlay */}
      {showHitboxes && liveSnapshot && (
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 350,
          }}
        >
          {/* P1 Hurtbox (Green) */}
          {p1 && (
            <rect
              x={p1.hurtbox.x}
              y={p1.hurtbox.y}
              width={p1.hurtbox.width}
              height={p1.hurtbox.height}
              fill="rgba(46, 204, 113, 0.15)"
              stroke="#2ecc71"
              strokeWidth="2"
              strokeDasharray="4 2"
            />
          )}

          {/* P2 Hurtbox (Blue) */}
          {p2 && (
            <rect
              x={p2.hurtbox.x}
              y={p2.hurtbox.y}
              width={p2.hurtbox.width}
              height={p2.hurtbox.height}
              fill="rgba(52, 152, 219, 0.15)"
              stroke="#3498db"
              strokeWidth="2"
              strokeDasharray="4 2"
            />
          )}

          {/* Active Attack Hitboxes (Red) */}
          {liveSnapshot.activeHitboxes.map(hb => (
            <rect
              key={hb.id}
              x={hb.bounds.x}
              y={hb.bounds.y}
              width={hb.bounds.width}
              height={hb.bounds.height}
              fill="rgba(231, 76, 60, 0.35)"
              stroke="#e74c3c"
              strokeWidth="2"
            />
          ))}
        </svg>
      )}

      {/* Phaser Canvas */}
      <PhaserGameContainer
        key={dojoKey}
        mode="singleplayer"
        arenaId="coloseum"
        playerPreset="knight"
        opponentPreset={dummyBehavior === 'attack' ? 'marauder' : 'knight'}
        botDifficulty={
          dummyBehavior === 'stand'
            ? 'novice'
            : dummyBehavior === 'block_all'
              ? 'adept'
              : dummyBehavior === 'jump'
                ? 'expert'
                : 'master'
        }
        botName={
          dummyBehavior === 'block_all'
            ? 'Iron Guard Dummy'
            : dummyBehavior === 'jump'
              ? 'Acrobat Dummy'
              : dummyBehavior === 'attack'
                ? 'Berserk Dummy'
                : 'Training Dummy'
        }
        onSnapshot={handleSnapshot}
        onExit={() => router.push('/game')}
      />
    </div>
  );
}
