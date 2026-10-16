'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Room } from 'colyseus.js';
import { BattleRoomState, StatisticsManager } from '@last-crown/shared';
import { GameSimulationSnapshot } from '@last-crown/game-core';
import { VoiceChatState, useVoiceChat } from '../voice/useVoiceChat';
import { VoiceControls } from '../voice/VoiceControls';

export interface GameHUDProps {
  snapshot: GameSimulationSnapshot | null;
  mode?: 'singleplayer' | 'multiplayer';
  colyseusRoom?: Room<BattleRoomState> | null;
  voiceState?: VoiceChatState;
  onRematch?: () => void;
  onExit?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  isPaused?: boolean;
  onTogglePause?: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  snapshot,
  mode = 'singleplayer',
  colyseusRoom,
  voiceState,
  onRematch,
  onExit,
  isFullscreen,
  onToggleFullscreen,
  isPaused = false,
  onTogglePause,
}) => {
  const fallbackVoice = useVoiceChat({
    room: mode === 'multiplayer' && !voiceState ? colyseusRoom : null,
  });
  const voice = voiceState || fallbackVoice;
  const currentMatchIdRef = useRef<string>(
    `match_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  );
  const hasRecordedRef = useRef<boolean>(false);

  // In-game controls guide modal state
  const [showControls, setShowControls] = useState<boolean>(false);

  // Audio pause menu settings state
  const [volume, setVolume] = useState<number>(50);
  const [sfxMuted, setSfxMuted] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('last_crown_player_settings_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.volume === 'number') setVolume(parsed.volume);
        if (typeof parsed.sfxMuted === 'boolean') setSfxMuted(parsed.sfxMuted);
      }
    } catch {
      // localStorage fallback
    }
  }, []);

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    try {
      const raw = window.localStorage.getItem('last_crown_player_settings_v1');
      const parsed = raw ? JSON.parse(raw) : {};
      parsed.volume = newVol;
      window.localStorage.setItem('last_crown_player_settings_v1', JSON.stringify(parsed));
      window.dispatchEvent(new CustomEvent('last_crown_settings_changed'));
    } catch {}
  };

  const handleMuteToggle = () => {
    const next = !sfxMuted;
    setSfxMuted(next);
    try {
      const raw = window.localStorage.getItem('last_crown_player_settings_v1');
      const parsed = raw ? JSON.parse(raw) : {};
      parsed.sfxMuted = next;
      window.localStorage.setItem('last_crown_player_settings_v1', JSON.stringify(parsed));
      window.dispatchEvent(new CustomEvent('last_crown_settings_changed'));
    } catch {}
  };

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

  // Keyboard shortcut listener for Controls modal (H key and Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyH') {
        setShowControls(prev => !prev);
      } else if (e.code === 'Escape' && showControls) {
        setShowControls(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showControls]);

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
          mode === 'multiplayer' ? 'multiplayer' : 'singleplayer',
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

          {/* P1 Execution Danger Badge */}
          {p1.health > 0 && (p1.health <= 28 || isP1Exhausted) && (
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 900,
                color: '#ff4757',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                textShadow: '0 0 10px rgba(255, 71, 87, 0.9)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>💀</span>
              <span>DANGER: VULNERABLE TO EXECUTION</span>
            </div>
          )}

          {/* P1 Combo Counter Badge */}
          {p1.comboCount !== undefined && p1.comboCount >= 2 && (
            <div
              style={{
                fontSize: '0.92rem',
                fontWeight: 900,
                color: '#f1c40f',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                textShadow: '0 0 12px rgba(241, 196, 15, 0.95), 0 2px 4px #000',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                animation: 'pulse 0.4s infinite alternate',
              }}
            >
              <span>🔥</span>
              <span>{p1.comboCount} HITS COMBO!</span>
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

          {/* Pause Button - ONLY rendered in Singleplayer Mode, NEVER in online matches */}
          {mode === 'singleplayer' && onTogglePause && (
            <button
              type="button"
              onClick={onTogglePause}
              style={{
                marginTop: '6px',
                backgroundColor: isPaused ? '#f1c40f' : 'rgba(21, 28, 40, 0.9)',
                color: isPaused ? '#070b12' : '#f1c40f',
                border: '1px solid var(--border-gold)',
                borderRadius: '4px',
                padding: '3px 12px',
                fontSize: '0.72rem',
                fontWeight: 900,
                letterSpacing: '0.08em',
                cursor: 'pointer',
                pointerEvents: 'auto',
                textTransform: 'uppercase',
                boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
                transition: 'all 0.15s ease',
              }}
              title="Pause duel (Hotkey: P or Escape)"
            >
              {isPaused ? '▶️ Resume' : '⏸️ Pause (P)'}
            </button>
          )}
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

          {/* P2 Execution Opportunity Badge for P1 */}
          {p2.health > 0 && (p2.health <= 28 || isP2Exhausted) && (
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 900,
                color: '#f1c40f',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                textAlign: 'right',
                textShadow: '0 0 10px rgba(241, 196, 15, 0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '6px',
                animation: 'pulse 0.6s infinite alternate',
              }}
            >
              <span>⚡ EXECUTION READY [HEAVY STRIKE: K]</span>
              <span>💀</span>
            </div>
          )}

          {/* P2 Combo Counter Badge */}
          {p2.comboCount !== undefined && p2.comboCount >= 2 && (
            <div
              style={{
                fontSize: '0.92rem',
                fontWeight: 900,
                color: '#e74c3c',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                textAlign: 'right',
                textShadow: '0 0 12px rgba(231, 76, 60, 0.95), 0 2px 4px #000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '6px',
                animation: 'pulse 0.4s infinite alternate',
              }}
            >
              <span>{p2.comboCount} HITS COMBO!</span>
              <span>🔥</span>
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

      {/* Bottom Floating Utility Controls */}
      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
          paddingBottom: '2px',
        }}
      >
        {/* Bottom Left: Navigation & Controls Guide */}
        <div style={{ display: 'flex', gap: '10px', pointerEvents: 'auto' }}>
          <button
            type="button"
            onClick={onExit ? onExit : () => (window.location.href = '/')}
            title="Return to Main Hall"
            style={{
              backgroundColor: 'rgba(10, 14, 22, 0.78)',
              color: '#cbd5e1',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              borderRadius: '6px',
              padding: '7px 13px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backdropFilter: 'blur(4px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
              transition: 'all 0.15s ease',
            }}
          >
            ← {mode === 'multiplayer' ? 'Leave Chamber' : 'Main Hall'}
          </button>
          <button
            type="button"
            onClick={() => setShowControls(prev => !prev)}
            title="Toggle Controls Guide (H)"
            style={{
              backgroundColor: 'rgba(10, 14, 22, 0.78)',
              color: showControls ? '#f1c40f' : '#cbd5e1',
              border: showControls ? '1px solid #f1c40f' : '1px solid rgba(212, 175, 55, 0.4)',
              borderRadius: '6px',
              padding: '7px 13px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backdropFilter: 'blur(4px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
              transition: 'all 0.15s ease',
            }}
          >
            ⌨ Controls <span style={{ opacity: 0.6, fontSize: '0.72rem' }}>[H]</span>
          </button>
          {mode === 'multiplayer' && colyseusRoom && <VoiceControls voice={voice} compact={true} />}
        </div>

        {/* Bottom Right: Fullscreen Toggle */}
        <div style={{ pointerEvents: 'auto' }}>
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              style={{
                backgroundColor: 'rgba(10, 14, 22, 0.78)',
                color: '#cbd5e1',
                border: '1px solid rgba(212, 175, 55, 0.4)',
                borderRadius: '6px',
                padding: '7px 13px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backdropFilter: 'blur(4px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                transition: 'all 0.15s ease',
              }}
            >
              {isFullscreen ? '⛶ Windowed' : '⛶ Fullscreen'}
            </button>
          )}
        </div>
      </div>

      {/* Gothic Combat Controls Guide Modal */}
      {showControls && (
        <div
          role="dialog"
          aria-label="Combat Controls Reference"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(5, 8, 16, 0.88)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 300,
            pointerEvents: 'auto',
          }}
          onClick={() => setShowControls(false)}
        >
          <div
            style={{
              backgroundColor: '#0a0e18',
              border: '2px solid var(--border-gold)',
              borderRadius: '10px',
              padding: '24px 32px',
              maxWidth: '660px',
              width: '92%',
              boxShadow: '0 12px 48px rgba(0,0,0,0.9), 0 0 24px rgba(212, 175, 55, 0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: 'var(--text-gold)',
                  fontSize: '1.25rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                ⚔️ Combat Controls Reference
              </h3>
              <button
                type="button"
                onClick={() => setShowControls(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '4px 8px',
                }}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '14px',
                fontSize: '0.9rem',
              }}
            >
              <div>
                <strong style={{ color: 'var(--text-gold)' }}>A / D / Arrows:</strong>
                <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  Move Left / Right
                </p>
              </div>
              <div>
                <strong style={{ color: 'var(--text-gold)' }}>Space (or W / ↑):</strong>
                <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>Jump</p>
              </div>
              <div>
                <strong style={{ color: '#e67e22' }}>C / E:</strong>
                <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>Tactical Dash</p>
              </div>
              <div>
                <strong style={{ color: '#f39c12' }}>J:</strong>
                <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  Light Slash (3-Hit Combo)
                </p>
              </div>
              <div>
                <strong style={{ color: '#e67e22' }}>S + J:</strong>
                <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  Low Sweep (Trips High Guard; Jump to evade)
                </p>
              </div>
              <div>
                <strong style={{ color: '#e74c3c' }}>K:</strong>
                <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  Heavy Strike & Execution
                </p>
              </div>
              <div>
                <strong style={{ color: '#9b59b6' }}>L / U:</strong>
                <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  Forward Thrust (Reach)
                </p>
              </div>
              <div>
                <strong style={{ color: '#1abc9c' }}>Windup + Dash/Guard:</strong>
                <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  Feint Cancel (Bait Parries)
                </p>
              </div>
              <div>
                <strong style={{ color: '#3498db' }}>Shift / I:</strong>
                <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  Block (Absorbs 75%)
                </p>
              </div>
              <div>
                <strong style={{ color: '#f1c40f' }}>Alt / O:</strong>
                <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  Parry & Riposte Counter
                </p>
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <button
                type="button"
                onClick={() => setShowControls(false)}
                style={{
                  backgroundColor: 'var(--border-gold)',
                  color: '#070b12',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 24px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Back To Duel [Esc]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gothic Pause Menu Modal Overlay (Singleplayer Only) */}
      {mode === 'singleplayer' && isPaused && matchState !== 'match_over' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(5, 7, 14, 0.88)',
            backdropFilter: 'blur(8px)',
            zIndex: 200,
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(10, 14, 24, 0.96)',
              border: '2px solid var(--border-gold)',
              borderRadius: '16px',
              padding: '28px 36px',
              maxWidth: '680px',
              width: '100%',
              boxShadow: '0 20px 70px rgba(0, 0, 0, 0.95), 0 0 35px rgba(212, 175, 55, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              color: '#e2e8f0',
            }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.2rem', filter: 'drop-shadow(0 0 10px #f1c40f)' }}>⚔️</div>
              <h2
                style={{
                  fontSize: '2rem',
                  fontWeight: 900,
                  color: '#f1c40f',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  margin: '4px 0 0 0',
                  textShadow: '0 3px 12px rgba(0,0,0,0.9), 0 0 20px rgba(241,196,15,0.4)',
                }}
              >
                DUEL PAUSED
              </h2>
              <p
                style={{
                  color: '#a0aec0',
                  fontSize: '0.88rem',
                  fontStyle: 'italic',
                  margin: '4px 0 0 0',
                  letterSpacing: '0.04em',
                }}
              >
                Tactical Respite — The Battle Awaits Your Command
              </p>
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              {onTogglePause && (
                <button
                  type="button"
                  onClick={onTogglePause}
                  style={{
                    backgroundColor: '#f1c40f',
                    color: '#070b12',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 26px',
                    fontSize: '0.98rem',
                    fontWeight: 900,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(241, 196, 15, 0.45)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  ▶️ Resume Duel (P / Esc)
                </button>
              )}
              {onRematch && (
                <button
                  type="button"
                  onClick={onRematch}
                  style={{
                    backgroundColor: '#1a2233',
                    color: '#f1c40f',
                    border: '1px solid var(--border-gold)',
                    borderRadius: '8px',
                    padding: '12px 22px',
                    fontSize: '0.98rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  🔄 Restart Match
                </button>
              )}
              <Link href="/" style={{ textDecoration: 'none' }}>
                <button
                  type="button"
                  style={{
                    backgroundColor: '#121722',
                    color: '#cbd5e1',
                    border: '1px solid #4a5568',
                    borderRadius: '8px',
                    padding: '12px 20px',
                    fontSize: '0.98rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  🏰 Castle Hall
                </button>
              </Link>
            </div>

            {/* Audio Settings Bar */}
            <div
              style={{
                backgroundColor: 'rgba(15, 20, 32, 0.85)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                borderRadius: '10px',
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flex: 1,
                  minWidth: '220px',
                }}
              >
                <span
                  style={{
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    color: '#f1c40f',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  🔊 Audio Volume
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={e => handleVolumeChange(Number(e.target.value))}
                  style={{
                    flex: 1,
                    accentColor: '#f1c40f',
                    cursor: 'pointer',
                  }}
                />
                <span
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    color: '#cbd5e1',
                    width: '38px',
                    textAlign: 'right',
                  }}
                >
                  {volume}%
                </span>
              </div>
              <button
                type="button"
                onClick={handleMuteToggle}
                style={{
                  backgroundColor: sfxMuted ? '#7f1d1d' : '#1e293b',
                  color: sfxMuted ? '#fca5a5' : '#f1c40f',
                  border: `1px solid ${sfxMuted ? '#ef4444' : 'rgba(212, 175, 55, 0.4)'}`,
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {sfxMuted ? '🔇 Audio Muted' : '🔊 SFX Active'}
              </button>
            </div>

            {/* Tactical Fighting Techniques & Move Reference */}
            <div
              style={{
                backgroundColor: 'rgba(12, 16, 26, 0.85)',
                border: '1px solid #2d3748',
                borderRadius: '10px',
                padding: '14px 18px',
              }}
            >
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 900,
                  color: '#f1c40f',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>📜</span>
                <span>Tactical Fighting Arts & Maneuvers</span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
                  gap: '8px 16px',
                  fontSize: '0.78rem',
                  color: '#cbd5e1',
                  lineHeight: '1.4',
                }}
              >
                <div>
                  <strong style={{ color: '#f1c40f' }}>🗡️ 3-Hit Combo Chain:</strong> Rapidly tap{' '}
                  <strong style={{ color: '#fff' }}>J</strong> for Slash ➔ Rising Slash ➔ Spinning
                  Finisher.
                </div>
                <div>
                  <strong style={{ color: '#f1c40f' }}>💥 Decapitating Execution:</strong> Execute
                  rivals at critical health/broken posture with a{' '}
                  <strong style={{ color: '#fff' }}>Heavy Strike (K)</strong> or 3-hit combo
                  finisher!
                </div>
                <div>
                  <strong style={{ color: '#f1c40f' }}>🦅 Helm Splitter:</strong> Jump with{' '}
                  <strong style={{ color: '#fff' }}>Space / W</strong>, then strike with{' '}
                  <strong style={{ color: '#fff' }}>J / K</strong> in mid-air to plunge downward
                  with ground-slam impact.
                </div>
                <div>
                  <strong style={{ color: '#f1c40f' }}>⚡ Evasive Lunge:</strong> Dash forward with{' '}
                  <strong style={{ color: '#fff' }}>C / E</strong>, then hit{' '}
                  <strong style={{ color: '#fff' }}>J</strong> to pierce enemy defenses.
                </div>
                <div>
                  <strong style={{ color: '#f1c40f' }}>🧱 Wall Bounce:</strong> Heavy strikes into
                  arena bounds cause warriors to violently rebound off stone walls.
                </div>
                <div>
                  <strong style={{ color: '#f1c40f' }}>🛡️ Parry & Stagger:</strong> Timed parry with{' '}
                  <strong style={{ color: '#fff' }}>Alt / O / L</strong> deflects blows and causes
                  heavy posture exhaustion.
                </div>
              </div>
            </div>
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
            gap: '12px',
            backgroundColor: 'rgba(5, 8, 16, 0.88)',
            border: '1px solid rgba(212, 175, 55, 0.35)',
            borderRadius: '20px',
            padding: '6px 18px',
            fontSize: '0.76rem',
            color: '#a0aec0',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px rgba(0,0,0,0.7)',
          }}
        >
          <span>
            <strong style={{ color: '#f1c40f' }}>A/D</strong> Move
          </span>
          <span style={{ color: '#4a5568' }}>•</span>
          <span>
            <strong style={{ color: '#f1c40f' }}>Space</strong> Jump
          </span>
          <span style={{ color: '#4a5568' }}>•</span>
          <span>
            <strong style={{ color: '#f1c40f' }}>C / E</strong> Dash
          </span>
          <span style={{ color: '#4a5568' }}>•</span>
          <span>
            <strong style={{ color: '#f1c40f' }}>J</strong> Light
          </span>
          <span style={{ color: '#4a5568' }}>•</span>
          <span>
            <strong style={{ color: '#f1c40f' }}>S+J</strong> Sweep
          </span>
          <span style={{ color: '#4a5568' }}>•</span>
          <span>
            <strong style={{ color: '#f1c40f' }}>K</strong> Heavy/Exec
          </span>
          <span style={{ color: '#4a5568' }}>•</span>
          <span>
            <strong style={{ color: '#f1c40f' }}>L / U</strong> Thrust
          </span>
          <span style={{ color: '#4a5568' }}>•</span>
          <span>
            <strong style={{ color: '#f1c40f' }}>Shift</strong> Guard
          </span>
          <span style={{ color: '#4a5568' }}>•</span>
          <span>
            <strong style={{ color: '#f1c40f' }}>Alt / O</strong> Parry/Riposte
          </span>
          {mode === 'singleplayer' && (
            <>
              <span style={{ color: '#4a5568' }}>•</span>
              <span>
                <strong style={{ color: '#f1c40f' }}>P / Esc</strong> Pause
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
};
