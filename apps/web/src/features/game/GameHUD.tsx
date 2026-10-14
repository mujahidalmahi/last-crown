'use client';

import React from 'react';
import { GameSimulationSnapshot } from '@last-crown/game-core';

export interface GameHUDProps {
  snapshot: GameSimulationSnapshot | null;
}

export const GameHUD: React.FC<GameHUDProps> = ({ snapshot }) => {
  if (!snapshot) return null;

  const { p1, p2, timerSeconds, roundNumber, matchState, winnerId } = snapshot;

  const p1HealthPercent = Math.max(0, Math.min(100, (p1.health / p1.maxHealth) * 100));
  const p1StaminaPercent = Math.max(0, Math.min(100, (p1.stamina / p1.maxStamina) * 100));

  const p2HealthPercent = Math.max(0, Math.min(100, (p2.health / p2.maxHealth) * 100));
  const p2StaminaPercent = Math.max(0, Math.min(100, (p2.stamina / p2.maxStamina) * 100));

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '16px 32px',
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        userSelect: 'none',
      }}
    >
      {/* Top Bar: Health Bars & Center Timer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '24px',
        }}
      >
        {/* P1 Stats */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontWeight: 800,
                color: '#f1c40f',
                fontSize: '1.1rem',
                letterSpacing: '0.05em',
              }}
            >
              {p1.name}
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {Array.from({ length: 2 }).map((_, i) => (
                <span key={i} style={{ opacity: i < p1.roundsWon ? 1 : 0.25, fontSize: '1.2rem' }}>
                  👑
                </span>
              ))}
            </div>
          </div>
          {/* Health Bar */}
          <div
            style={{
              height: '22px',
              backgroundColor: '#1e272e',
              borderRadius: '4px',
              overflow: 'hidden',
              border: '2px solid #2f3640',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${p1HealthPercent}%`,
                background: 'linear-gradient(90deg, #e74c3c 0%, #2ecc71 100%)',
                transition: 'width 0.1s linear',
              }}
            />
          </div>
          {/* Stamina Bar */}
          <div
            style={{
              height: '8px',
              backgroundColor: '#1e272e',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${p1StaminaPercent}%`,
                backgroundColor: '#3498db',
                transition: 'width 0.1s linear',
              }}
            />
          </div>
        </div>

        {/* Center Round & Match Timer */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: 'rgba(11, 14, 20, 0.85)',
            border: '2px solid var(--border-gold)',
            borderRadius: '8px',
            padding: '6px 20px',
            minWidth: '100px',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.6)',
          }}
        >
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Round {roundNumber}
          </span>
          <span style={{ fontSize: '2rem', fontWeight: 900, color: '#f1c40f', lineHeight: 1 }}>
            {timerSeconds}
          </span>
        </div>

        {/* P2 Stats */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {Array.from({ length: 2 }).map((_, i) => (
                <span key={i} style={{ opacity: i < p2.roundsWon ? 1 : 0.25, fontSize: '1.2rem' }}>
                  👑
                </span>
              ))}
            </div>
            <span
              style={{
                fontWeight: 800,
                color: '#e74c3c',
                fontSize: '1.1rem',
                letterSpacing: '0.05em',
              }}
            >
              {p2.name}
            </span>
          </div>
          {/* Health Bar (mirrored) */}
          <div
            style={{
              height: '22px',
              backgroundColor: '#1e272e',
              borderRadius: '4px',
              overflow: 'hidden',
              border: '2px solid #2f3640',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${p2HealthPercent}%`,
                float: 'right',
                background: 'linear-gradient(270deg, #e74c3c 0%, #2ecc71 100%)',
                transition: 'width 0.1s linear',
              }}
            />
          </div>
          {/* Stamina Bar (mirrored) */}
          <div
            style={{
              height: '8px',
              backgroundColor: '#1e272e',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${p2StaminaPercent}%`,
                float: 'right',
                backgroundColor: '#3498db',
                transition: 'width 0.1s linear',
              }}
            />
          </div>
        </div>
      </div>

      {/* Match Over Banner */}
      {matchState === 'match_over' && (
        <div
          style={{
            alignSelf: 'center',
            marginTop: '80px',
            backgroundColor: 'rgba(10, 12, 16, 0.95)',
            border: '2px solid var(--border-gold)',
            borderRadius: '8px',
            padding: '24px 48px',
            textAlign: 'center',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.9)',
          }}
        >
          <h2
            style={{
              fontSize: '2.5rem',
              fontWeight: 900,
              color: '#f1c40f',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            {winnerId === p1.id ? 'VICTORY' : 'DEFEATED'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '1.1rem' }}>
            {winnerId === p1.id ? 'The Crown Belongs To You!' : 'Only One Shall Reign.'}
          </p>
        </div>
      )}
    </div>
  );
};
