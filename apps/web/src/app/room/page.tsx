'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useMultiplayerRoom } from '../../features/multiplayer/useMultiplayerRoom';
import { useVoiceChat } from '../../features/voice/useVoiceChat';
import { VoiceControls } from '../../features/voice/VoiceControls';
import { requestBrowserFullscreen } from '../../utils/fullscreen';
import styles from './room.module.css';

const PhaserGameContainer = dynamic(
  () => import('../../features/game/PhaserGameContainer').then(mod => mod.PhaserGameContainer),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#070b12',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          zIndex: 9999,
          fontFamily: "'Press Start 2P', monospace",
        }}
      >
        <span style={{ fontSize: '3rem', filter: 'drop-shadow(0 0 12px #f1c40f)' }}>⚔️</span>
        <p
          style={{
            color: '#f1c40f',
            fontWeight: 800,
            fontSize: '1rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          ENTERING MULTIPLAYER ARENA...
        </p>
      </div>
    ),
  }
);

export default function RoomPage() {
  const {
    isConnected,
    isConnecting,
    roomId,
    inviteCode,
    error,
    roomState,
    latencyMs,
    room,
    createPrivateRoom,
    joinPrivateRoom,
    findQuickMatch,
    leaveRoom,
    requestBotOpponent,
    toggleReady,
    queueStatus,
    opponentNotice,
  } = useMultiplayerRoom();

  const voice = useVoiceChat({ room });

  const [inputCode, setInputCode] = useState('');
  const [playerName, setPlayerName] = useState('Crown Warrior');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [serverStats, setServerStats] = useState<{
    activeMatches: number;
    totalConnectedPlayers: number;
  } | null>(null);

  // Poll server health and active match statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const httpUrl =
          process.env.NEXT_PUBLIC_SERVER_HTTP_URL ||
          (typeof window !== 'undefined'
            ? `${window.location.protocol}//${window.location.hostname}:2567`
            : 'http://localhost:2567');
        const res = await fetch(`${httpUrl}/health`).catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          setServerStats({
            activeMatches: data.activeMatches ?? 0,
            totalConnectedPlayers: data.totalConnectedPlayers ?? 0,
          });
        }
      } catch {
        // Handled gracefully
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 8000);
    return () => clearInterval(interval);
  }, []);

  // Check URL query parameters for invite code auto-fill
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const codeFromUrl = params.get('code') || params.get('join');
      if (codeFromUrl) {
        setInputCode(codeFromUrl.toUpperCase().trim());
      }
    }
  }, []);

  const handleQuickMatch = async () => {
    try {
      await requestBrowserFullscreen();
    } catch {
      // Handled gracefully
    }
    await findQuickMatch(playerName.trim() || 'Crown Warrior', 'knight');
  };

  const handleCreate = async () => {
    try {
      await requestBrowserFullscreen();
    } catch {
      // Handled gracefully
    }
    await createPrivateRoom(playerName.trim() || 'Crown Warrior', 'knight');
  };

  const handleJoin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = inputCode.trim().toUpperCase();
    if (cleanCode.length !== 6) return;
    try {
      await requestBrowserFullscreen();
    } catch {
      // Handled gracefully
    }
    await joinPrivateRoom(cleanCode, playerName.trim() || 'Crown Warrior', 'knight');
  };

  const handleCopyCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyLink = () => {
    if (inviteCode && typeof window !== 'undefined') {
      const url = `${window.location.origin}/room?code=${inviteCode}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const isMatchReady = Boolean(roomState?.matchState && roomState.matchState !== 'waiting');

  const warriorsList: { id: string; name: string; isReady: boolean }[] = [];
  if (roomState?.warriors) {
    roomState.warriors.forEach(w => {
      warriorsList.push({
        id: w.id,
        name: w.name,
        isReady: Boolean(w.isReady),
      });
    });
  }

  const myWarrior = warriorsList.find(w => w.id === room?.sessionId);
  const isMyWarriorReady = myWarrior?.isReady ?? false;
  const isBothReady = warriorsList.length === 2 && warriorsList.every(w => w.isReady);

  // Case 1: Active Match in Progress (Server signaled in_progress or higher)
  if (isConnected && room && isMatchReady) {
    return (
      <div className={styles.matchViewport}>
        <PhaserGameContainer
          mode="multiplayer"
          colyseusRoom={room}
          playerPreset="knight"
          voiceState={voice}
          onExit={leaveRoom}
        />
      </div>
    );
  }

  // Case 2: Waiting in Chamber Lobby
  if (isConnected && room && !isMatchReady) {
    return (
      <div className={styles.viewport}>
        <div className={styles.scanlineOverlay} aria-hidden="true" />
        <div className={styles.stageWrapper}>
          <div className={styles.waitingCard} role="region" aria-label="Waiting Chamber">
            <h2 className={styles.waitingTitle}>
              {inviteCode ? '⚔️ Private Duel Chamber' : '⚔️ Public Matchmaking'}
            </h2>
            <p className={styles.waitingSubtitle}>
              {inviteCode
                ? 'Awaiting your opponent to enter the crucible. Share your 6-character code below:'
                : 'Seeking a worthy challenger in the global queue...'}
            </p>

            {inviteCode && (
              <>
                <div className={styles.codeBox} title="Click to select code">
                  {inviteCode}
                </div>

                <div className={styles.copyButtonGroup}>
                  <button type="button" className={styles.copyBtn} onClick={handleCopyCode}>
                    {copiedCode ? '✓ Code Copied!' : '📋 Copy Code'}
                  </button>
                  <button type="button" className={styles.copyBtn} onClick={handleCopyLink}>
                    {copiedLink ? '✓ Link Copied!' : '🔗 Copy Direct Link'}
                  </button>
                </div>
              </>
            )}

            {!inviteCode && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  alignItems: 'center',
                  width: '100%',
                  margin: '8px 0',
                }}
              >
                <div
                  style={{
                    backgroundColor: 'rgba(212, 175, 55, 0.12)',
                    border: '1px solid rgba(212, 175, 55, 0.35)',
                    borderRadius: '4px',
                    padding: '8px 14px',
                    color: '#f1c40f',
                    fontSize: '11px',
                    textAlign: 'center',
                    width: '100%',
                    letterSpacing: '0.05em',
                  }}
                >
                  {queueStatus
                    ? `Searching for rival... (${queueStatus.secondsInQueue}s) · AI Champion enters in ${queueStatus.secondsUntilBot}s`
                    : 'Searching for an online challenger...'}
                </div>
                <button
                  type="button"
                  onClick={requestBotOpponent}
                  className={styles.copyBtn}
                  style={{
                    width: '100%',
                    backgroundColor: '#d4af37',
                    color: '#070b12',
                    fontWeight: 900,
                  }}
                  title="Skip queue and duel an authoritative AI Arena Champion immediately"
                >
                  ⚔️ Summon AI Champion Now
                </button>
              </div>
            )}

            {opponentNotice && (
              <div
                style={{
                  backgroundColor:
                    opponentNotice.type === 'forfeited' || opponentNotice.type === 'left'
                      ? 'rgba(231, 76, 60, 0.2)'
                      : 'rgba(241, 196, 15, 0.2)',
                  border: '1px solid #e74c3c',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  color: '#f87171',
                  fontSize: '11px',
                  textAlign: 'center',
                  width: '100%',
                  margin: '4px 0',
                }}
              >
                ⚠️ {opponentNotice.message}
              </div>
            )}

            {/* Dynamic Chamber Roster */}
            <div className={styles.rosterBox}>
              <div className={styles.rosterTitle}>
                Chamber Roster ({warriorsList.length}/2)
              </div>

              {/* Slot 1: Host / First Warrior */}
              {warriorsList[0] ? (
                <div
                  className={`${styles.rosterItem} ${
                    warriorsList[0].isReady ? styles.rosterItemReady : styles.rosterItemNotReady
                  }`}
                >
                  <span>
                    👑 {warriorsList[0].name} {warriorsList[0].id === room?.sessionId ? '(YOU)' : ''}
                  </span>
                  <span
                    className={
                      warriorsList[0].isReady ? styles.statusBadgeReady : styles.statusBadgeNotReady
                    }
                  >
                    {warriorsList[0].isReady ? '✓ READY' : '⏳ NOT READY'}
                  </span>
                </div>
              ) : (
                <div className={`${styles.rosterItem} ${styles.rosterItemWaiting}`}>
                  <span>👑 Awaiting Host...</span>
                  <span className={styles.statusBadgeWaiting}>WAITING</span>
                </div>
              )}

              {/* Slot 2: Challenger / Second Warrior */}
              {warriorsList[1] ? (
                <div
                  className={`${styles.rosterItem} ${
                    warriorsList[1].isReady ? styles.rosterItemReady : styles.rosterItemNotReady
                  }`}
                >
                  <span>
                    ⚔️ {warriorsList[1].name} {warriorsList[1].id === room?.sessionId ? '(YOU)' : ''}
                  </span>
                  <span
                    className={
                      warriorsList[1].isReady ? styles.statusBadgeReady : styles.statusBadgeNotReady
                    }
                  >
                    {warriorsList[1].isReady ? '✓ READY' : '⏳ NOT READY'}
                  </span>
                </div>
              ) : (
                <div className={`${styles.rosterItem} ${styles.rosterItemWaiting}`}>
                  <span>⚔️ Awaiting Challenger...</span>
                  <span className={styles.statusBadgeWaiting}>WAITING</span>
                </div>
              )}
            </div>

            {/* Custom Room Ready Controls */}
            {inviteCode && (
              <div className={styles.readyActionContainer}>
                {isBothReady ? (
                  <div className={styles.startingBanner}>
                    ⚔️ BOTH WARRIORS READY! COMMENCING DUEL...
                  </div>
                ) : (
                  <button
                    type="button"
                    className={`${styles.readyToggleBtn} ${
                      isMyWarriorReady ? styles.readyToggleBtnActive : ''
                    }`}
                    onClick={toggleReady}
                  >
                    {isMyWarriorReady ? '✓ READY (CLICK TO CANCEL)' : '⚔️ READY FOR COMBAT'}
                  </button>
                )}
                {!isBothReady && (
                  <p className={styles.readyHint}>
                    {warriorsList.length < 2
                      ? 'Share your room code with a friend. Match will begin once both warriors confirm ready.'
                      : isMyWarriorReady
                        ? 'Awaiting your opponent to confirm readiness...'
                        : 'Click READY FOR COMBAT when you are prepared to duel!'}
                  </p>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <VoiceControls voice={voice} compact={true} />
              <button type="button" className={styles.leaveBtn} onClick={leaveRoom}>
                Abandon Chamber
              </button>
            </div>

            {roomId && (
              <span style={{ fontSize: '7px', color: '#64748b', marginTop: '4px' }}>
                Room ID: {roomId}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Case 3: Online Duel Arena Screen (Exact Match to Reference Design)
  return (
    <div className={styles.viewport}>
      {/* Subtle CRT Scanline Filter */}
      <div className={styles.scanlineOverlay} aria-hidden="true" />

      {/* Main 1024x572 Stage */}
      <div className={styles.stageWrapper}>
        {/* Top Navigation Pill Bar */}
        <nav className={styles.topNav} aria-label="Duel arena navigation">
          <Link href="/" className={styles.mainHallBtn} title="Return to Main Hall">
            <span>←</span> MAIN HALL
          </Link>
          <div className={styles.arenaBadge}>MULTIPLAYER ARENA</div>
          <div className={styles.statsBadge} title="Real-time live battle statistics">
            <span>🌐</span>{' '}
            {serverStats
              ? `${serverStats.activeMatches} ACTIVE ${serverStats.activeMatches === 1 ? 'DUEL' : 'DUELS'} · ${serverStats.totalConnectedPlayers} WARRIORS`
              : '0 ACTIVE DUELS · 0 WARRIORS'}
          </div>
          {latencyMs > 0 && (
            <div
              className={styles.latencyBadge}
              style={{
                color: latencyMs < 65 ? '#34d399' : latencyMs < 120 ? '#fbbf24' : '#f87171',
                border: `1.5px solid ${latencyMs < 65 ? '#10b981' : latencyMs < 120 ? '#f59e0b' : '#ef4444'}`,
              }}
            >
              📶 {latencyMs}ms
            </div>
          )}
        </nav>

        {/* Central Stone Card (1024x572 pixel-art frame) */}
        <main className={styles.stoneCard} role="main" aria-label="Online Duel Arena Menu">
          {/* Accessible Headings for SEO and Screen Readers */}
          <h1 className={styles.srOnly}>Online Duel Arena</h1>
          <p className={styles.srOnly}>
            Join a public match to test your blade against online rivals, or forge an exclusive
            private chamber with a secret invite code.
          </p>

          {/* 1. YOUR BATTLE NAME INPUT */}
          <input
            type="text"
            className={styles.nameInput}
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            maxLength={20}
            placeholder="Crown Warrior"
            aria-label="Your Battle Name"
            title="Choose your battle name before entering combat"
          />

          {/* 2. QUICK DUEL BUTTON */}
          <button
            type="button"
            className={styles.quickDuelBtn}
            onClick={handleQuickMatch}
            disabled={isConnecting}
            aria-label="Find Match (Quick Duel)"
            title="Instantly pair up with any open challenger searching for an online match right now."
          >
            {isConnecting && <span className={styles.btnLoadingOverlay}>SEARCHING...</span>}
            <span className={styles.srOnly}>Find Match (Quick Duel)</span>
          </button>

          {/* 3. HOST PRIVATE DUEL BUTTON */}
          <button
            type="button"
            className={styles.createRoomBtn}
            onClick={handleCreate}
            disabled={isConnecting}
            aria-label="Create Private Room"
            title="Forge a private chamber and invite a friend with a secret 6 character invitation code."
          >
            {isConnecting && <span className={styles.btnLoadingOverlay}>FORGING...</span>}
            <span className={styles.srOnly}>Create Private Room</span>
          </button>

          {/* 4. JOIN BY CODE INPUT */}
          <input
            type="text"
            className={styles.codeInput}
            value={inputCode}
            onChange={e => setInputCode(e.target.value.toUpperCase().slice(0, 6))}
            maxLength={6}
            placeholder="E.G. 7K2M9X"
            aria-label="Enter 6-character Invite Code"
            title="Enter the 6-character code provided by your opponent"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleJoin();
              }
            }}
          />

          {/* 5. ENTER WITH CODE BUTTON */}
          <button
            type="button"
            className={styles.enterCodeBtn}
            onClick={() => handleJoin()}
            disabled={isConnecting || inputCode.trim().length !== 6}
            aria-label="Enter with Code"
            title="Enter chamber with the 6-character invite code"
          >
            {isConnecting && <span className={styles.btnLoadingOverlay}>JOINING...</span>}
            <span className={styles.srOnly}>Enter With Code</span>
          </button>
        </main>

        {/* Error Notification Banner */}
        {error && (
          <div className={styles.errorBanner} role="alert">
            <span>⚠️ {error}</span>
            <Link href="/play">
              <button type="button" className={styles.dismissErrorBtn}>
                ⚔️ Play Offline Bot
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
