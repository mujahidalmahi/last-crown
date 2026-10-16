'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Room } from 'colyseus.js';
import { BattleRoomState, StatisticsManager, ClientMessageType } from '@last-crown/shared';
import { GameSimulationSnapshot } from '@last-crown/game-core';
import { VoiceChatState, useVoiceChat } from '../voice/useVoiceChat';
import { VoiceControls } from '../voice/VoiceControls';
import victoryStyles from './VictoryCard.module.css';
import hudStyles from './GameHUD.module.css';

export interface GameHUDProps {
  snapshot: GameSimulationSnapshot | null;
  mode?: 'singleplayer' | 'multiplayer' | 'local_multiplayer';
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
      if (snapshot.isSuddenDeath) {
        setRoundSplash('💀 SUDDEN DEATH 💀');
        const timer1 = setTimeout(() => {
          setRoundSplash('FINAL BLOOD!');
        }, 1100);
        const timer2 = setTimeout(() => {
          setRoundSplash(null);
        }, 2200);
        return () => {
          clearTimeout(timer1);
          clearTimeout(timer2);
        };
      } else {
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
    }
    return undefined;
  }, [snapshot?.roundNumber, snapshot?.matchState, snapshot?.isSuddenDeath]);

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
    <div className={hudStyles.hudRoot}>
      {/* Low Health Mortal Danger Pulsing Vignette */}
      {p1HealthPercent <= 25 && p1HealthPercent > 0 && matchState === 'in_progress' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 5,
            boxShadow:
              'inset 0 0 60px rgba(231, 76, 60, 0.4), inset 0 0 120px rgba(192, 57, 43, 0.25)',
            animation: 'pulse 1.2s infinite ease-in-out',
          }}
        />
      )}

      {/* Top Bar: Gothic Health Bars & Center Medallion */}
      <div className={hudStyles.topBar}>
        {/* P1 Stats (Player / Host) */}
        <div className={hudStyles.fighterStats}>
          <div className={hudStyles.fighterHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem', filter: 'drop-shadow(0 0 6px #f1c40f)' }}>🛡️</span>
              <span className={hudStyles.playerName} style={{ color: '#f1c40f' }}>
                {p1.name}
              </span>
            </div>
            {/* Rounds Won Crowns */}
            <div className={hudStyles.crownsWon}>
              {Array.from({ length: 2 }).map((_, i) => (
                <span
                  key={i}
                  className={hudStyles.crownIcon}
                  style={{
                    opacity: i < p1.roundsWon ? 1 : 0.2,
                    filter: i < p1.roundsWon ? 'drop-shadow(0 0 8px #f1c40f)' : 'grayscale(100%)',
                  }}
                >
                  👑
                </span>
              ))}
            </div>
          </div>

          {/* Gothic Health Bar Shell */}
          <div className={hudStyles.healthBarShell}>
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
            className={hudStyles.staminaBarShell}
            style={{
              border: isP1Exhausted ? '1px solid #e74c3c' : '1px solid #1e272e',
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
        <div className={hudStyles.timerMedallion}>
          {/* Top Filigree Accent */}
          <span className={hudStyles.roundLabel}>Round {roundNumber}</span>
          <span
            className={hudStyles.timerDigits}
            style={{
              color: timerSeconds <= 10 ? '#ff3838' : '#f1c40f',
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
              className={hudStyles.pauseBtn}
              style={{
                backgroundColor: isPaused ? '#f1c40f' : 'rgba(21, 28, 40, 0.9)',
                color: isPaused ? '#070b12' : '#f1c40f',
                border: '1px solid var(--border-gold)',
              }}
              title="Pause duel (Hotkey: P or Escape)"
            >
              {isPaused ? '▶️ Resume' : '⏸️ Pause (P)'}
            </button>
          )}
        </div>

        {/* P2 Stats (Opponent / Bot) */}
        <div className={hudStyles.fighterStats}>
          <div className={hudStyles.fighterHeader}>
            {/* Rounds Won Crowns */}
            <div className={hudStyles.crownsWon}>
              {Array.from({ length: 2 }).map((_, i) => (
                <span
                  key={i}
                  className={hudStyles.crownIcon}
                  style={{
                    opacity: i < p2.roundsWon ? 1 : 0.2,
                    filter: i < p2.roundsWon ? 'drop-shadow(0 0 8px #f1c40f)' : 'grayscale(100%)',
                  }}
                >
                  👑
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={hudStyles.playerName} style={{ color: '#e74c3c' }}>
                {p2.name}
              </span>
              {(colyseusRoom?.state?.isBotMatch || p2.name.includes('(AI)')) && (
                <span
                  style={{
                    fontSize: '0.65rem',
                    color: '#f1c40f',
                    border: '1px solid #f1c40f',
                    borderRadius: '3px',
                    padding: '2px 5px',
                    letterSpacing: '0.08em',
                  }}
                >
                  AI
                </span>
              )}
              <span style={{ fontSize: '1.2rem', filter: 'drop-shadow(0 0 6px #e74c3c)' }}>⚔️</span>
            </div>
          </div>

          {/* Gothic Health Bar Shell (Mirrored) */}
          <div className={hudStyles.healthBarShell}>
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
            className={hudStyles.staminaBarShell}
            style={{
              border: isP2Exhausted ? '1px solid #e74c3c' : '1px solid #1e272e',
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

      {/* Opponent Disconnected Grace Banner in Multiplayer */}
      {mode === 'multiplayer' && colyseusRoom?.state?.isOpponentDisconnected && (
        <div
          style={{
            position: 'absolute',
            top: '84px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(180, 30, 30, 0.95)',
            border: '2px solid #f1c40f',
            borderRadius: '6px',
            padding: '8px 24px',
            color: '#fff',
            fontWeight: 900,
            fontSize: '0.9rem',
            letterSpacing: '0.08em',
            textShadow: '0 2px 4px #000',
            boxShadow: '0 0 20px rgba(231, 76, 60, 0.8)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            pointerEvents: 'auto',
          }}
        >
          <span>⚠️</span>
          <span>
            OPPONENT DISCONNECTED — RECONNECT WINDOW:{' '}
            {colyseusRoom.state.disconnectGraceRemainingSec}s
          </span>
        </div>
      )}

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
              color:
                roundSplash.includes('SUDDEN') || roundSplash.includes('BLOOD')
                  ? '#ff3838'
                  : '#f1c40f',
              textShadow:
                roundSplash.includes('SUDDEN') || roundSplash.includes('BLOOD')
                  ? '0 0 35px rgba(255, 56, 56, 0.95), 0 4px 16px #000000'
                  : '0 0 30px rgba(241, 196, 15, 0.8), 0 4px 16px #000000',
              margin: 0,
              animation: 'pulse 0.4s infinite alternate',
            }}
          >
            {roundSplash}
          </h1>
        </div>
      )}

      {/* Post-Match Victory / Stalemate Medieval Stone Card */}
      {matchState === 'match_over' &&
        (() => {
          const isWin = winnerId === p1.id;
          const isDraw = winnerId === 'draw';
          const endReason = colyseusRoom?.state?.endReason || 'normal';

          let titleLines: string[] = [];
          const titleVariant = isWin ? 'win' : isDraw ? 'draw' : 'defeat';

          if (isWin) {
            if (endReason === 'opponent_forfeit') {
              titleLines = ['FORFEIT', 'VICTORY'];
            } else if (endReason === 'opponent_disconnect_timeout') {
              titleLines = ['TIMEOUT', 'VICTORY'];
            } else {
              titleLines = p2.isDecapitated ? ['DECAPITATION', 'VICTORY'] : ['VICTORY'];
            }
          } else if (isDraw) {
            titleLines = ['STALEMATE'];
          } else {
            titleLines = p1.isDecapitated ? ['DECAPITATED', 'DEFEAT'] : ['DEFEATED'];
          }

          const subtitleText = isWin
            ? endReason === 'opponent_forfeit'
              ? 'Your Opponent Fled The Arena In Shame! The Crown Belongs To You!'
              : endReason === 'opponent_disconnect_timeout'
                ? 'Opponent Disconnected. The Crown Champion Reigns Supreme!'
                : p2.isDecapitated
                  ? 'The Crown Champion Severed The Opponent In Mortal Combat!'
                  : 'The Crown Belongs To You!'
            : isDraw
              ? 'Both Champions Stood Equal In Blood & Steel.'
              : p1.isDecapitated
                ? 'Your Head Fell To The Arena Floor. Only One Shall Reign.'
                : 'Only One Shall Reign.';

          return (
            <div
              className={victoryStyles.victoryCardOverlay}
              role="dialog"
              aria-modal="true"
              aria-label="Match outcome"
            >
              <div className={victoryStyles.victoryCardStage}>
                {/* Retro Pixel Victory Title */}
                <div className={victoryStyles.titleContainer}>
                  {titleLines.map((line, idx) => (
                    <h2
                      key={idx}
                      className={`${victoryStyles.victoryTitle} ${titleVariant === 'draw' ? victoryStyles.draw : titleVariant === 'defeat' ? victoryStyles.defeat : ''}`}
                    >
                      {line}
                    </h2>
                  ))}
                </div>

                {/* Subtitle */}
                <p className={victoryStyles.subtitle}>{subtitleText}</p>

                {/* Fight Again Gold Pixel Button */}
                {onRematch && (
                  <button
                    type="button"
                    onClick={onRematch}
                    className={victoryStyles.fightAgainBtn}
                    aria-label="Fight Again"
                    title="Fight Again"
                  />
                )}

                {/* Castle Hall Stone Socket Link */}
                {onExit ? (
                  <button
                    type="button"
                    onClick={onExit}
                    className={victoryStyles.castleHallLink}
                    aria-label="Castle Hall"
                    title="Return to Castle Hall"
                    style={{ background: 'transparent', border: 'none' }}
                  />
                ) : (
                  <Link
                    href="/"
                    className={victoryStyles.castleHallLink}
                    aria-label="Castle Hall"
                    title="Return to Castle Hall"
                  />
                )}
              </div>
            </div>
          );
        })()}

      {/* Bottom Floating Utility Controls */}
      {/* Bottom Floating Utility Controls */}
      <div className={hudStyles.bottomUtilityBar}>
        {/* Bottom Left: Navigation & Voice & Forfeit */}
        <div className={hudStyles.utilityGroup}>
          <button
            type="button"
            onClick={onExit ? onExit : () => (window.location.href = '/')}
            title="Return to Main Hall"
            className={hudStyles.utilityBtn}
          >
            ← {mode === 'multiplayer' ? 'Leave Chamber' : 'Main Hall'}
          </button>
          {mode === 'multiplayer' && colyseusRoom && <VoiceControls voice={voice} compact={true} />}
          {mode === 'multiplayer' && colyseusRoom && matchState === 'in_progress' && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Surrender and forfeit this duel?')) {
                  colyseusRoom.send(ClientMessageType.FORFEIT_MATCH, {});
                }
              }}
              title="Surrender and forfeit this duel"
              className={hudStyles.utilityBtn}
              style={{
                backgroundColor: 'rgba(231, 76, 60, 0.25)',
                color: '#f87171',
                border: '1px solid rgba(231, 76, 60, 0.6)',
              }}
            >
              🏳️ Forfeit
            </button>
          )}
        </div>

        {/* Bottom Right: Controls Guide & Fullscreen Toggle */}
        <div className={hudStyles.utilityGroup}>
          <button
            type="button"
            onClick={() => setShowControls(prev => !prev)}
            title="Toggle Controls Guide (H)"
            className={hudStyles.utilityBtn}
            style={{
              color: showControls ? '#f1c40f' : '#cbd5e1',
              borderColor: showControls ? '#f1c40f' : undefined,
            }}
          >
            ⌨ Controls <span style={{ opacity: 0.6, fontSize: '0.72rem' }}>[H]</span>
          </button>
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              className={hudStyles.utilityBtn}
            >
              {isFullscreen ? '⛶ Windowed' : '⛶ Fullscreen'}
            </button>
          )}
        </div>
      </div>

      {/* Combat Controls Reference Medieval Stone Modal (Hotkey: H) */}
      {showControls && (
        <div
          className={victoryStyles.controlsModalBackdrop}
          onClick={() => setShowControls(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Combat Controls Reference"
        >
          <div className={victoryStyles.controlsCardStage} onClick={e => e.stopPropagation()}>
            {/* Top-Right Stone 'X' Close Button */}
            <button
              type="button"
              onClick={() => setShowControls(false)}
              className={victoryStyles.closeButton}
              aria-label="Close Controls Reference"
              title="Close [Esc]"
            />

            {/* Bottom Golden Pixel 'BACK TO DUEL [ESC]' Button */}
            <button
              type="button"
              onClick={() => setShowControls(false)}
              className={victoryStyles.backToDuelBtn}
              aria-label="Back To Duel"
              title="Back To Duel [Esc]"
            />

            {/* Semantic screen-reader accessibility */}
            <div className={victoryStyles.srOnly}>
              <h3>Combat Controls Reference</h3>
              <ul>
                <li>A / D / Arrows: Move Left / Right</li>
                <li>Space (or W / ↑): Jump</li>
                <li>C / E: Tactical Dash</li>
                <li>J: Light Slash (3-Hit Combo)</li>
                <li>S + J: Low Sweep (Trips High Guard; Jump to evade)</li>
                <li>K: Heavy Strike & Execution</li>
                <li>L / U: Forward Thrust (Reach)</li>
                <li>Windup + Dash/Guard: Feint Cancel (Bait Parries)</li>
                <li>Shift / I: Block (Absorbs 75%)</li>
                <li>Alt / O: Parry & Riposte Counter</li>
              </ul>
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
          <div className={hudStyles.pauseModalContainer}>
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

      {/* Realistic Combat Controls Ribbon - Floating cleanly above the bottom utility bar */}
      {matchState !== 'match_over' && (
        <div
          onClick={() => setShowControls(true)}
          title="Click or press H for full Combat Controls Reference"
          className={hudStyles.controlsRibbon}
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
