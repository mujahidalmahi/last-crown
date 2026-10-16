'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useMultiplayerRoom } from '../../features/multiplayer/useMultiplayerRoom';
import { useVoiceChat } from '../../features/voice/useVoiceChat';
import { VoiceControls } from '../../features/voice/VoiceControls';
import { requestBrowserFullscreen } from '../../utils/fullscreen';

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
        }}
      >
        <span style={{ fontSize: '3rem', filter: 'drop-shadow(0 0 12px #f1c40f)' }}>⚔️</span>
        <p
          style={{
            color: 'var(--text-gold)',
            fontWeight: 800,
            fontSize: '1.2rem',
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
      } catch {}
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
    } catch {}
    await findQuickMatch(playerName, 'knight');
  };

  const handleCreate = async () => {
    try {
      await requestBrowserFullscreen();
    } catch {}
    await createPrivateRoom(playerName, 'knight');
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    try {
      await requestBrowserFullscreen();
    } catch {}
    await joinPrivateRoom(inputCode.trim(), playerName, 'knight');
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

  const warriorCount = roomState?.warriors ? roomState.warriors.size : 0;
  const isMatchReady =
    warriorCount >= 2 || (roomState?.matchState && roomState.matchState !== 'waiting');

  return (
    <div
      style={{
        maxWidth: isMatchReady ? '1280px' : '840px',
        margin: '0 auto',
        padding: '32px 24px',
        width: '100%',
      }}
    >
      {/* Top Navigation & Status Bar */}
      <div
        style={{
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/">
            <Button variant="secondary" size="sm">
              ← Main Hall
            </Button>
          </Link>
          <Badge variant={isConnected ? (isMatchReady ? 'green' : 'gold') : 'steel'}>
            {!isConnected
              ? 'Multiplayer Arena'
              : isMatchReady
                ? '⚔️ Duel In Progress'
                : inviteCode
                  ? '⏳ Waiting for Rival'
                  : '⚔️ Searching for Match...'}
          </Badge>
          {isConnected && latencyMs > 0 && (
            <Badge variant={latencyMs < 65 ? 'green' : latencyMs < 120 ? 'gold' : 'crimson'}>
              📶 {latencyMs}ms
            </Badge>
          )}
          {serverStats && !isConnected && (
            <Badge variant="steel">
              🌐 {serverStats.activeMatches} Active{' '}
              {serverStats.activeMatches === 1 ? 'Duel' : 'Duels'} ·{' '}
              {serverStats.totalConnectedPlayers} Warriors
            </Badge>
          )}
        </div>

        {isConnected && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {inviteCode && (
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Code: <strong style={{ color: '#f1c40f' }}>{inviteCode}</strong>
              </span>
            )}
            {!isMatchReady && <VoiceControls voice={voice} compact={true} />}
            <Button variant="danger" size="sm" onClick={leaveRoom}>
              Abandon Chamber
            </Button>
          </div>
        )}
      </div>

      {!isConnected && (
        <>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 900,
              color: 'var(--text-gold)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '8px',
            }}
          >
            Online Duel Arena
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
            Join a public match to test your blade against online rivals, or forge an exclusive
            private chamber with a secret invite code.
          </p>
        </>
      )}

      {error && (
        <div
          role="alert"
          style={{
            backgroundColor: 'rgba(197, 48, 48, 0.2)',
            border: '1px solid var(--accent-crimson)',
            borderRadius: '6px',
            padding: '16px',
            color: '#feb2b2',
            marginBottom: '24px',
            fontSize: '0.95rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div>
            <strong>Notice:</strong> {error}
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href="/play">
              <Button variant="primary" size="sm">
                ⚔️ Play Offline Practice (Bot Duel)
              </Button>
            </Link>
            <span style={{ fontSize: '0.8rem', color: '#cbd5e0' }}>
              No server required for local/bot duels.
            </span>
          </div>
        </div>
      )}

      {isConnected && room ? (
        isMatchReady ? (
          // Active 2-Player Match View
          <div>
            <PhaserGameContainer
              mode="multiplayer"
              colyseusRoom={room}
              voiceState={voice}
              playerPreset="knight"
              onExit={leaveRoom}
            />
          </div>
        ) : (
          // Waiting Lobby View
          <Card
            header={
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <h2 style={{ fontSize: '1.25rem', color: '#f1c40f' }}>
                  {inviteCode
                    ? 'Private Chamber — Awaiting Opponent'
                    : 'Public Queue — Searching for Rival'}
                </h2>
                <Badge variant="gold">1 / 2 Warriors</Badge>
              </div>
            }
          >
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              {inviteCode ? (
                <>
                  <p
                    style={{
                      color: 'var(--text-secondary)',
                      marginBottom: '12px',
                      fontSize: '1.05rem',
                    }}
                  >
                    Share this Invite Code or Link with your rival:
                  </p>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '12px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '2px dashed var(--border-gold)',
                      padding: '14px 32px',
                      borderRadius: '8px',
                      fontSize: '2.4rem',
                      fontWeight: 900,
                      letterSpacing: '0.25em',
                      color: '#f1c40f',
                      marginBottom: '20px',
                      userSelect: 'all',
                    }}
                  >
                    <span>{inviteCode}</span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '12px',
                      justifyContent: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <Button variant="outline" size="sm" onClick={handleCopyCode}>
                      {copiedCode ? '✓ Code Copied' : '📋 Copy Code'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCopyLink}>
                      {copiedLink ? '✓ Link Copied' : '🔗 Copy Direct Link'}
                    </Button>
                  </div>
                </>
              ) : (
                <div style={{ padding: '16px 0' }}>
                  <span style={{ fontSize: '2.4rem', display: 'block', marginBottom: '12px' }}>
                    ⚔️
                  </span>
                  <p
                    style={{
                      color: '#f1c40f',
                      fontWeight: 800,
                      fontSize: '1.2rem',
                      marginBottom: '8px',
                    }}
                  >
                    Seeking a worthy challenger...
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    The match will automatically begin the moment another warrior enters
                    matchmaking.
                  </p>
                </div>
              )}

              {/* Roster Status Box */}
              <div
                style={{
                  marginTop: '36px',
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '20px',
                  maxWidth: '480px',
                  margin: '36px auto 0',
                }}
              >
                <h3
                  style={{
                    fontSize: '1rem',
                    color: '#cbd5e1',
                    marginBottom: '16px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Chamber Roster
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 16px',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '6px',
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#34d399' }}>👑 {playerName}</span>
                    <Badge variant="green">Ready</Badge>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 16px',
                      backgroundColor: 'rgba(148, 163, 184, 0.05)',
                      border: '1px dashed #475569',
                      borderRadius: '6px',
                    }}
                  >
                    <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                      Awaiting Challenger...
                    </span>
                    <Badge variant="steel">Queueing</Badge>
                  </div>
                </div>
              </div>

              <p style={{ marginTop: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Room ID: <code style={{ color: 'var(--text-secondary)' }}>{roomId}</code>
              </p>
            </div>
          </Card>
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Warrior Name Bar */}
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-gold)',
              borderRadius: '8px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flex: 1,
                minWidth: '240px',
              }}
            >
              <span style={{ fontSize: '1.4rem' }}>🛡️</span>
              <Input
                label="Your Battle Name"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                maxLength={24}
                style={{ margin: 0 }}
              />
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Choose your moniker before entering the crucible.
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px',
            }}
          >
            {/* Quick Match Card */}
            <Card header={<h2 style={{ fontSize: '1.2rem', color: '#2ecc71' }}>⚔️ Quick Duel</h2>}>
              <p
                style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}
              >
                Instantly pair up with any open challenger searching for an online match right now.
              </p>
              <Button
                variant="primary"
                size="md"
                style={{ width: '100%', backgroundColor: '#27ae60', borderColor: '#2ecc71' }}
                onClick={handleQuickMatch}
                disabled={isConnecting}
              >
                {isConnecting ? 'Searching Queue...' : 'Find Match (Quick Duel)'}
              </Button>
            </Card>

            {/* Create Room Card */}
            <Card
              header={
                <h2 style={{ fontSize: '1.2rem', color: 'var(--text-gold)' }}>
                  🔒 Host Private Duel
                </h2>
              }
            >
              <p
                style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}
              >
                Forge a private chamber and invite a friend with a secret 6-character invitation
                code.
              </p>
              <Button
                variant="primary"
                size="md"
                style={{ width: '100%' }}
                onClick={handleCreate}
                disabled={isConnecting}
              >
                {isConnecting ? 'Forging Chamber...' : 'Create Private Room'}
              </Button>
            </Card>

            {/* Join Room Card */}
            <Card
              header={<h2 style={{ fontSize: '1.2rem', color: '#3498db' }}>🗝️ Join by Code</h2>}
            >
              <form onSubmit={handleJoin}>
                <p
                  style={{
                    color: 'var(--text-secondary)',
                    marginBottom: '16px',
                    fontSize: '0.9rem',
                  }}
                >
                  Enter the 6-character code provided by your opponent.
                </p>
                <Input
                  label="Invite Code"
                  placeholder="e.g. 7K2M9X"
                  value={inputCode}
                  onChange={e => setInputCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  style={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 800 }}
                />
                <Button
                  variant="outline"
                  size="md"
                  type="submit"
                  style={{ width: '100%', marginTop: '8px' }}
                  disabled={isConnecting || inputCode.length !== 6}
                >
                  {isConnecting ? 'Joining Chamber...' : 'Enter with Code'}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
