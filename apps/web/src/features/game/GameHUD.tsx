'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { GameSimulationSnapshot } from '@last-crown/game-core';
import { StatisticsManager } from '@last-crown/shared';

export interface GameHUDProps {
  snapshot: GameSimulationSnapshot | null;
  mode?: 'singleplayer' | 'multiplayer';
  onRematch?: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({ snapshot, mode = 'singleplayer', onRematch }) => {
  const currentMatchIdRef = useRef<string>(
    `match_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  );
  const hasRecordedRef = useRef<boolean>(false);

  // Ghost health trailing states (arcade fighting game damage delay)
  const [p1GhostHealth, setP1GhostHealth] = useState<number>(100);
  const [p2GhostHealth, setP2GhostHealth] = useState<number>(100);

  // Round announcement banner splash
  const [roundSplash, setRoundSplash] = useState<string | null>(null);
  const lastRoundSeenRef = useRef<number>(0);

  const p1Health = snapshot?.p1 ? snapshot.p1.health : 100;
  const p1MaxHealth = snapshot?.p1 ? snapshot.p1.maxHealth : 100;
  const p1HealthPercent = Math.max(0, Math.min(100, (p1Health / p1MaxHealth) * 100));

  const p2Health = snapshot?.p2 ? snapshot.p2.health : 100;
  const p2MaxHealth = snapshot?.p2 ? snapshot.p2.maxHealth : 100;
  const p2HealthPercent = Math.max(0, Math.min(100, (p2Health / p2MaxHealth) * 100));

  // Trailing ghost health animation for P1
  useEffect(() => {
    if (p1HealthPercent < p1GhostHealth) {
      const timer = setTimeout(() => {
        setP1GhostHealth(p1HealthPercent);
      }, 350);
      return () => clearTimeout(timer);
    } else {
      setP1GhostHealth(p1HealthPercent);
      return undefined;
    }
  }, [p1HealthPercent, p1GhostHealth]);

  // Trailing ghost health animation for P2
  useEffect(() => {
    if (p2HealthPercent < p2GhostHealth) {
      const timer = setTimeout(() => {
        setP2GhostHealth(p2HealthPercent);
      }, 350);
      return () => clearTimeout(timer);
    } else {
      setP2GhostHealth(p2HealthPercent);
      return undefined;
    }
  }, [p2HealthPercent, p2GhostHealth]);

  // Round start splash trigger
  useEffect(() => {
    if (
      snapshot &&
      snapshot.roundNumber !== lastRoundSeenRef.current &&
      snapshot.matchState === 'in_progress'
    ) {
      lastRoundSeenRef.current = snapshot.roundNumber;
      setRoundSplash(`ROUND ${snapshot.roundNumber}`);
      const timer1 = setTimeout(() => {
        setRoundSplash('DUEL!');
      }, 900);
      const timer2 = setTimeout(() => {
        setRoundSplash(null);
      }, 1800);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
    return undefined;
  }, [snapshot?.roundNumber, snapshot?.matchState]);

  // Reset match ID on new match or rematch
  useEffect(() => {
    if (
      snapshot?.matchState === 'in_progress' &&
      p1HealthPercent === 100 &&
      p2HealthPercent === 100
    ) {
      hasRecordedRef.current = false;
      currentMatchIdRef.current = `match_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    }
  }, [snapshot?.matchState, p1HealthPercent, p2HealthPercent]);

  // Record match statistics once upon match_over
  useEffect(() => {
    if (snapshot?.matchState === 'match_over' && !hasRecordedRef.current) {
      hasRecordedRef.current = true;
      const isWin = snapshot.winnerId === snapshot.p1.id;
      const isDraw = snapshot.winnerId === 'draw';
      const outcome = isWin ? 'win' : isDraw ? 'draw' : 'loss';

      try {
        const statsMgr = StatisticsManager.getInstance();
        statsMgr.recordMatchResult(
          currentMatchIdRef.current,
          outcome,
          mode,
          isWin ? 150 : isDraw ? 50 : 25
        );
      } catch (err) {
        console.warn('[GameHUD] Failed to record statistics:', err);
      }
    }
  }, [snapshot?.matchState, snapshot?.winnerId, snapshot?.p1.id, mode]);

  if (!snapshot) return null;

  const { p1, p2, timerSeconds, roundNumber, matchState, winnerId } = snapshot;

  const p1StaminaPercent = Math.max(0, Math.min(100, (p1.stamina / p1.maxStamina) * 100));
  const p2StaminaPercent = Math.max(0, Math.min(100, (p2.stamina / p2.maxStamina) * 100));

  const isP1Exhausted = !!p1.isExhausted;
  const isP2Exhausted = !!p2.isExhausted;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        padding: '16px 28px',
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
      }}
    >
      {/* Top Bar: Gothic Health Bars & Center Medallion */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '24px',
        }}
      >
        {/* P1 Stats (Player / Host) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem', filter: 'drop-shadow(0 0 6px #f1c40f)' }}>🛡️</span>
              <span
                style={{
                  fontWeight: 900,
                  color: '#f1c40f',
                  fontSize: '1.15rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  textShadow: '0 2px 8px rgba(0, 0, 0, 0.9)',
                }}
              >
                {p1.name}
              </span>
            </div>
            {/* Rounds Won Crowns */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {Array.from({ length: 2 }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    opacity: i < p1.roundsWon ? 1 : 0.2,
                    fontSize: '1.3rem',
                    filter: i < p1.roundsWon ? 'drop-shadow(0 0 8px #f1c40f)' : 'grayscale(100%)',
                    transition: 'all 0.3s ease',
                  }}
                >
                  👑
                </span>
              ))}
            </div>
          </div>

          {/* Gothic Health Bar Shell */}
          <div
            style={{
              position: 'relative',
              height: '24px',
              backgroundColor: '#0a0d14',
              borderRadius: '4px',
              overflow: 'hidden',
              border: '2px solid #3d495c',
              boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)',
            }}
          >
            {/* Red Ghost Damage Bar */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: `${p1GhostHealth}%`,
                backgroundColor: '#e74c3c',
                transition: 'width 0.45s cubic-bezier(0.25, 1, 0.5, 1)',
              }}
            />
            {/* Active Vibrant Health Bar */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: `${p1HealthPercent}%`,
                background: 'linear-gradient(90deg, #e67e22 0%, #2ecc71 100%)',
                boxShadow: '0 0 10px rgba(46, 204, 113, 0.5)',
                transition: 'width 0.08s linear',
              }}
            />
            {/* Metallic Sheen Overlay */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '40%',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)',
              }}
            />
          </div>

          {/* Segmented Stamina Bar */}
          <div
            style={{
              position: 'relative',
              height: '9px',
              backgroundColor: '#0a0d14',
              borderRadius: '2px',
              overflow: 'hidden',
              border: isP1Exhausted ? '1px solid #e74c3c' : '1px solid #1e272e',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8)',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${p1StaminaPercent}%`,
                backgroundColor: isP1Exhausted ? '#e74c3c' : '#00cec9',
                boxShadow: isP1Exhausted ? '0 0 8px #e74c3c' : '0 0 6px rgba(0, 206, 201, 0.6)',
                transition: 'width 0.08s linear',
              }}
            />
            {/* Stamina Segments (25%, 50%, 75%) */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: '25%',
                width: '1px',
                backgroundColor: 'rgba(0,0,0,0.6)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: '50%',
                width: '1px',
                backgroundColor: 'rgba(0,0,0,0.6)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: '75%',
                width: '1px',
                backgroundColor: 'rgba(0,0,0,0.6)',
              }}
            />
          </div>

          {/* Exhaustion Warning Badge */}
          {isP1Exhausted && (
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 900,
                color: '#ff3838',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                textShadow: '0 0 10px rgba(255, 56, 56, 0.9)',
                animation: 'pulse 0.7s infinite alternate',
              }}
            >
              ⚠️ POSTURE BROKEN — EXHAUSTED
            </div>
          )}
        </div>

        {/* Center Round & Match Timer Medallion */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: 'rgba(10, 14, 22, 0.92)',
            border: '2px solid var(--border-gold)',
            borderRadius: '10px',
            padding: '6px 22px',
            minWidth: '116px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.85), 0 0 16px rgba(212, 175, 55, 0.15)',
            position: 'relative',
          }}
        >
          {/* Top Filigree Accent */}
          <span
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              fontWeight: 800,
            }}
          >
            Round {roundNumber}
          </span>
          <span
            style={{
              fontSize: '2.2rem',
              fontWeight: 900,
              color: timerSeconds <= 10 ? '#ff3838' : '#f1c40f',
              lineHeight: 1.1,
              fontVariantNumeric: 'tabular-nums',
              textShadow:
                timerSeconds <= 10
                  ? '0 0 12px rgba(255, 56, 56, 0.8)'
                  : '0 2px 8px rgba(0,0,0,0.8)',
              animation: timerSeconds <= 10 ? 'pulse 0.6s infinite alternate' : 'none',
            }}
          >
            {timerSeconds}
          </span>
        </div>

        {/* P2 Stats (Opponent / Bot) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Rounds Won Crowns */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {Array.from({ length: 2 }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    opacity: i < p2.roundsWon ? 1 : 0.2,
                    fontSize: '1.3rem',
                    filter: i < p2.roundsWon ? 'drop-shadow(0 0 8px #f1c40f)' : 'grayscale(100%)',
                    transition: 'all 0.3s ease',
                  }}
                >
                  👑
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontWeight: 900,
                  color: '#e74c3c',
                  fontSize: '1.15rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  textShadow: '0 2px 8px rgba(0, 0, 0, 0.9)',
                }}
              >
                {p2.name}
              </span>
              <span style={{ fontSize: '1.2rem', filter: 'drop-shadow(0 0 6px #e74c3c)' }}>⚔️</span>
            </div>
          </div>

          {/* Gothic Health Bar Shell (Mirrored) */}
          <div
            style={{
              position: 'relative',
              height: '24px',
              backgroundColor: '#0a0d14',
              borderRadius: '4px',
              overflow: 'hidden',
              border: '2px solid #3d495c',
              boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)',
            }}
          >
            {/* Red Ghost Damage Bar */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                right: 0,
                width: `${p2GhostHealth}%`,
                backgroundColor: '#e74c3c',
                transition: 'width 0.45s cubic-bezier(0.25, 1, 0.5, 1)',
              }}
            />
            {/* Active Vibrant Health Bar */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                right: 0,
                width: `${p2HealthPercent}%`,
                background: 'linear-gradient(270deg, #e67e22 0%, #2ecc71 100%)',
                boxShadow: '0 0 10px rgba(46, 204, 113, 0.5)',
                transition: 'width 0.08s linear',
              }}
            />
            {/* Metallic Sheen Overlay */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '40%',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)',
              }}
            />
          </div>

          {/* Segmented Stamina Bar (Mirrored) */}
          <div
            style={{
              position: 'relative',
              height: '9px',
              backgroundColor: '#0a0d14',
              borderRadius: '2px',
              overflow: 'hidden',
              border: isP2Exhausted ? '1px solid #e74c3c' : '1px solid #1e272e',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8)',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${p2StaminaPercent}%`,
                float: 'right',
                backgroundColor: isP2Exhausted ? '#e74c3c' : '#00cec9',
                boxShadow: isP2Exhausted ? '0 0 8px #e74c3c' : '0 0 6px rgba(0, 206, 201, 0.6)',
                transition: 'width 0.08s linear',
              }}
            />
            {/* Stamina Segments (25%, 50%, 75%) */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: '25%',
                width: '1px',
                backgroundColor: 'rgba(0,0,0,0.6)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: '50%',
                width: '1px',
                backgroundColor: 'rgba(0,0,0,0.6)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: '75%',
                width: '1px',
                backgroundColor: 'rgba(0,0,0,0.6)',
              }}
            />
          </div>

          {/* Exhaustion Warning Badge */}
          {isP2Exhausted && (
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 900,
                color: '#ff3838',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                textAlign: 'right',
                textShadow: '0 0 10px rgba(255, 56, 56, 0.9)',
                animation: 'pulse 0.7s infinite alternate',
              }}
            >
              ⚠️ POSTURE BROKEN — EXHAUSTED
            </div>
          )}
        </div>
      </div>

      {/* Dramatic Round Announcement Splash */}
      {roundSplash && matchState === 'in_progress' && (
        <div
          style={{
            position: 'absolute',
            top: '42%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
            zIndex: 100,
          }}
        >
          <h1
            style={{
              fontSize: '4.2rem',
              fontWeight: 900,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#f1c40f',
              textShadow: '0 0 30px rgba(241, 196, 15, 0.8), 0 4px 16px #000000',
              margin: 0,
              animation: 'pulse 0.4s infinite alternate',
            }}
          >
            {roundSplash}
          </h1>
        </div>
      )}

      {/* Post-Match Victory / Stalemate Banner */}
      {matchState === 'match_over' && (
        <div
          style={{
            alignSelf: 'center',
            margin: 'auto 0',
            backgroundColor: 'rgba(9, 12, 18, 0.97)',
            border: '2px solid var(--border-gold)',
            borderRadius: '14px',
            padding: '36px 52px',
            textAlign: 'center',
            boxShadow: '0 16px 64px rgba(0, 0, 0, 0.95), 0 0 32px rgba(212, 175, 55, 0.25)',
            pointerEvents: 'auto',
            maxWidth: '560px',
            width: '92%',
          }}
        >
          <span style={{ fontSize: '3rem', filter: 'drop-shadow(0 0 12px #f1c40f)' }}>👑</span>
          <h2
            style={{
              fontSize: '3rem',
              fontWeight: 900,
              color: winnerId === p1.id ? '#f1c40f' : winnerId === 'draw' ? '#bdc3c7' : '#e74c3c',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              margin: '8px 0 0 0',
              textShadow: '0 4px 16px rgba(0, 0, 0, 0.9)',
            }}
          >
            {winnerId === p1.id
              ? p2.isDecapitated
                ? 'DECAPITATION VICTORY'
                : 'VICTORY'
              : winnerId === 'draw'
                ? 'STALEMATE'
                : p1.isDecapitated
                  ? 'DECAPITATED'
                  : 'DEFEATED'}
          </h2>
          <p
            style={{
              color: 'var(--text-secondary)',
              marginTop: '10px',
              marginBottom: '28px',
              fontSize: '1.2rem',
              fontStyle: 'italic',
            }}
          >
            {winnerId === p1.id
              ? p2.isDecapitated
                ? 'The Crown Champion Severed The Opponent In Mortal Combat!'
                : 'The Crown Belongs To You!'
              : winnerId === 'draw'
                ? 'Both Champions Stood Equal In Blood & Steel.'
                : p1.isDecapitated
                  ? 'Your Head Fell To The Arena Floor. Only One Shall Reign.'
                  : 'Only One Shall Reign.'}
          </p>

          <div
            style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {onRematch && (
              <button
                type="button"
                onClick={onRematch}
                style={{
                  backgroundColor: '#f1c40f',
                  color: '#070b12',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '14px 32px',
                  fontSize: '1.05rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  boxShadow: '0 4px 20px rgba(241, 196, 15, 0.5)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
              >
                ⚔️ Fight Again
              </button>
            )}
            <Link href="/" style={{ textDecoration: 'none' }}>
              <button
                type="button"
                style={{
                  backgroundColor: '#1b222d',
                  color: '#e2e8f0',
                  border: '1px solid #4a5568',
                  borderRadius: '6px',
                  padding: '14px 26px',
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                🏰 Castle Hall
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* Realistic Combat Controls Ribbon */}
      {matchState !== 'match_over' && (
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '14px',
            backgroundColor: 'rgba(5, 8, 16, 0.85)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            borderRadius: '20px',
            padding: '6px 18px',
            fontSize: '0.78rem',
            color: '#a0aec0',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
          }}
        >
          <span>
            <strong style={{ color: '#f1c40f' }}>A/D</strong> Move & Skid
          </span>
          <span style={{ color: '#4a5568' }}>•</span>
          <span>
            <strong style={{ color: '#f1c40f' }}>W</strong> Jump (Tap = Hop)
          </span>
          <span style={{ color: '#4a5568' }}>•</span>
          <span>
            <strong style={{ color: '#f1c40f' }}>C / Double-Tap</strong> Dash
          </span>
          <span style={{ color: '#4a5568' }}>•</span>
          <span>
            <strong style={{ color: '#f1c40f' }}>J / Space</strong> Slash
          </span>
          <span style={{ color: '#4a5568' }}>•</span>
          <span>
            <strong style={{ color: '#f1c40f' }}>S + J</strong> Heavy
          </span>
          <span style={{ color: '#4a5568' }}>•</span>
          <span>
            <strong style={{ color: '#f1c40f' }}>U / I</strong> Thrust
          </span>
          <span style={{ color: '#4a5568' }}>•</span>
          <span>
            <strong style={{ color: '#f1c40f' }}>K / Shift</strong> Block
          </span>
          <span style={{ color: '#4a5568' }}>•</span>
          <span>
            <strong style={{ color: '#f1c40f' }}>L / Alt</strong> Parry
          </span>
        </div>
      )}
    </div>
  );
};
