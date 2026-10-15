'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useMultiplayerRoom } from '../../features/multiplayer/useMultiplayerRoom';
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
    room,
    createPrivateRoom,
    joinPrivateRoom,
    leaveRoom,
  } = useMultiplayerRoom();

  const [inputCode, setInputCode] = useState('');
  const [playerName, setPlayerName] = useState('Crown Warrior');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

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
              ? 'Private Matchmaking'
              : isMatchReady
                ? '⚔️ Duel In Progress'
                : '⏳ Waiting for Rival'}
          </Badge>
        </div>

        {isConnected && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {inviteCode && (
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Code: <strong style={{ color: '#f1c40f' }}>{inviteCode}</strong>
              </span>
            )}
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
            Private Duel Chamber
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
            Host a private 2-player chamber and invite your rival with a secure 6-character code, or
            enter a chamber with an invitation code.
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
          }}
        >
          <strong>Notice:</strong> {error}
        </div>
      )}

      {isConnected && room ? (
        isMatchReady ? (
          // Active 2-Player Match View
          <div>
            <PhaserGameContainer
              mode="multiplayer"
              colyseusRoom={room}
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
                  Chamber Active — Awaiting Opponent
                </h2>
                <Badge variant="gold">1 / 2 Warriors</Badge>
              </div>
            }
          >
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
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
                style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}
              >
                <Button variant="outline" size="sm" onClick={handleCopyCode}>
                  {copiedCode ? '✓ Code Copied' : '📋 Copy Code'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopyLink}>
                  {copiedLink ? '✓ Link Copied' : '🔗 Copy Direct Link'}
                </Button>
              </div>

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
                    <span style={{ fontWeight: 700, color: '#34d399' }}>
                      👑 {playerName} (Host)
                    </span>
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
                    <Badge variant="steel">Connecting</Badge>
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
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
          }}
        >
          {/* Create Room Card */}
          <Card
            header={<h2 style={{ fontSize: '1.2rem', color: 'var(--text-gold)' }}>Host a Duel</h2>}
          >
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>
              Forge a private battle chamber and invite a friend with an exclusive code.
            </p>
            <Input
              label="Your Warrior Name"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              maxLength={24}
            />
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
            header={<h2 style={{ fontSize: '1.2rem', color: '#3498db' }}>Join Rival Chamber</h2>}
          >
            <form onSubmit={handleJoin}>
              <p
                style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}
              >
                Enter the 6-character invite code provided by your opponent.
              </p>
              <Input
                label="6-Character Invite Code"
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
                style={{ width: '100%' }}
                disabled={isConnecting || inputCode.length !== 6}
              >
                {isConnecting ? 'Verifying Chamber...' : 'Enter Chamber with Code'}
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
