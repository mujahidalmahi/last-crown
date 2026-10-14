'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useMultiplayerRoom } from '../../features/multiplayer/useMultiplayerRoom';

export default function RoomPage() {
  const {
    isConnected,
    isConnecting,
    roomId,
    inviteCode,
    error,
    createPrivateRoom,
    joinPrivateRoom,
    leaveRoom,
  } = useMultiplayerRoom();

  const [inputCode, setInputCode] = useState('');
  const [playerName, setPlayerName] = useState('Crown Warrior');
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    await createPrivateRoom(playerName, 'knight');
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    await joinPrivateRoom(inputCode.trim(), playerName, 'knight');
  };

  const handleCopyCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px', width: '100%' }}>
      <div
        style={{
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link href="/">
          <Button variant="secondary" size="sm">
            ← Main Hall
          </Button>
        </Link>
        <Badge variant={isConnected ? 'green' : 'steel'}>
          {isConnected ? 'Connected to Room' : 'Private Matchmaking'}
        </Badge>
      </div>

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
        Create a private 2-player room and invite your rival with a secure 6-character invite code,
        or enter a code to join.
      </p>

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

      {isConnected ? (
        <Card
          header={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', color: '#f1c40f' }}>Chamber Active</h2>
              <Badge variant="green">2-Player Room</Badge>
            </div>
          }
        >
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Share this Invite Code with your opponent:
            </p>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                backgroundColor: 'var(--bg-primary)',
                border: '2px dashed var(--border-gold)',
                padding: '12px 28px',
                borderRadius: '8px',
                fontSize: '2rem',
                fontWeight: 900,
                letterSpacing: '0.25em',
                color: '#f1c40f',
                marginBottom: '16px',
              }}
            >
              <span>{inviteCode}</span>
            </div>
            <div>
              <Button variant="outline" size="sm" onClick={handleCopyCode}>
                {copied ? '✓ Copied to Clipboard' : '📋 Copy Invite Code'}
              </Button>
            </div>

            <p style={{ marginTop: '24px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Room ID: <code style={{ color: 'var(--text-secondary)' }}>{roomId}</code>
            </p>

            <div
              style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'center' }}
            >
              <Link href="/play">
                <Button variant="primary" size="lg">
                  Enter Duel Arena
                </Button>
              </Link>
              <Button variant="danger" size="lg" onClick={leaveRoom}>
                Abandon Chamber
              </Button>
            </div>
          </div>
        </Card>
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
              Generate a secure invitation code and wait for an opponent to enter your chamber.
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
