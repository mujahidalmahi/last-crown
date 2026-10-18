'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import QRCode from 'qrcode';
import { PartyControllerBridge } from '../../game/input/PartyControllerBridge';
import { GamepadInputAdapter } from '../../game/input/GamepadInputAdapter';
import { PartySlotState } from '@last-crown/shared';
import styles from './local.module.css';

const PhaserGameContainer = dynamic(
  () => import('../../features/game/PhaserGameContainer').then(mod => mod.PhaserGameContainer),
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
          color: '#f1c40f',
          fontFamily: "'Press Start 2P', monospace",
          fontSize: '1rem',
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
        <p>FORGING COUCH CO-OP ARENA...</p>
      </div>
    ),
  }
);

export default function LocalDuelPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [partyCode, setPartyCode] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [controllerUrl, setControllerUrl] = useState<string>('');
  const [partyState, setPartyState] = useState<PartySlotState | null>(null);
  const [copied, setCopied] = useState(false);

  // Physical Gamepad status
  const [hasGamepad0, setHasGamepad0] = useState(false);
  const [hasGamepad1, setHasGamepad1] = useState(false);

  // Player presets & arena
  const [p1Preset, setP1Preset] = useState('knight');
  const [p2Preset, setP2Preset] = useState('marauder');
  const [arenaId, setArenaId] = useState('coloseum');

  const gamepadAdapterRef = useRef<GamepadInputAdapter>(new GamepadInputAdapter());

  // Generate random 4-character code on mount
  useEffect(() => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPartyCode(code);
  }, []);

  // Connect Host and generate sharp pixel-perfect QR code
  useEffect(() => {
    if (!partyCode) return;

    const bridge = PartyControllerBridge.getInstance();
    let unmounted = false;

    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const fullUrl = `${origin}/controller?room=${partyCode}`;
    setControllerUrl(fullUrl);

    // Generate gold & dark QR Code with crisp 2x scaling (320px)
    QRCode.toDataURL(fullUrl, {
      margin: 1,
      width: 320,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#080d14',
        light: '#ffdb15',
      },
    })
      .then(url => {
        if (!unmounted) setQrCodeUrl(url);
      })
      .catch(err => {
        console.error('Error generating QR code:', err);
      });

    // Connect Host to Colyseus party room
    bridge
      .connectHost(partyCode)
      .then(() => {
        bridge.onPartyState(state => {
          if (!unmounted) setPartyState(state);
        });

        bridge.onMatchStart(() => {
          if (!unmounted) setIsPlaying(true);
        });
      })
      .catch(err => {
        console.error('Failed to connect host party bridge:', err);
      });

    return () => {
      unmounted = true;
    };
  }, [partyCode]);

  // Monitor physical gamepads
  useEffect(() => {
    const checkGamepads = () => {
      const adapter = gamepadAdapterRef.current;
      setHasGamepad0(adapter.hasGamepad(0));
      setHasGamepad1(adapter.hasGamepad(1));
    };

    checkGamepads();
    const interval = setInterval(checkGamepads, 1000);
    window.addEventListener('gamepadconnected', checkGamepads);
    window.addEventListener('gamepaddisconnected', checkGamepads);

    return () => {
      clearInterval(interval);
      window.removeEventListener('gamepadconnected', checkGamepads);
      window.removeEventListener('gamepaddisconnected', checkGamepads);
    };
  }, []);

  const handleCopyLink = useCallback(async () => {
    if (!controllerUrl) return;
    try {
      await navigator.clipboard.writeText(controllerUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Handled gracefully
    }
  }, [controllerUrl]);

  const handleStartMatch = () => {
    PartyControllerBridge.getInstance().sendStartMatch();
    setIsPlaying(true);
  };

  if (isPlaying) {
    return (
      <PhaserGameContainer
        mode="local_multiplayer"
        playerPreset={p1Preset}
        opponentPreset={p2Preset}
        arenaId={arenaId}
        onExit={() => setIsPlaying(false)}
        onRematch={() => setIsPlaying(true)}
      />
    );
  }

  return (
    <div className={styles.viewport}>
      {/* Subtle CRT Scanline Filter Overlay */}
      <div className={styles.scanlineOverlay} aria-hidden="true" />

      {/* Top Navigation Bar: Consistent with Settings & Room */}
      <nav className={styles.topNav} aria-label="Local duel navigation">
        <Link href="/game" className={styles.mainHallBtn} title="Return to Main Hall">
          <span>←</span> MAIN HALL
        </Link>
        <div className={styles.navBadge}>LOCAL 2-PLAYER DUEL</div>
      </nav>

      {/* Central 16:9 Stage Wrapper */}
      <main className={styles.stageWrapper} role="main" aria-label="Local 2-Player Setup">
        <div className={styles.stoneCard}>
          {/* Top Embossed Plaque Title */}
          <h1 className={styles.plaqueTitle}>LOCAL 2-PLAYER DUEL</h1>

          {/* Inner Canvas Compartment */}
          <div className={styles.innerCanvas}>
            {/* Left Column: Phone Controller QR */}
            <div className={styles.qrCard} role="region" aria-label="Phone Controller Setup">
              <h2 className={styles.qrTitle}>📱 PHONE CONTROLLER</h2>
              <p className={styles.qrSubtitle}>Scan to play wirelessly</p>

              <div className={styles.qrImageWrapper}>
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt={`Room QR Code for Party ${partyCode}`}
                    className={styles.qrImage}
                  />
                ) : (
                  <div className={styles.qrGenerating}>GENERATING...</div>
                )}
              </div>

              <div className={styles.roomCodeBox}>
                <span>CODE:</span>
                <span className={styles.roomCodeValue}>{partyCode || '----'}</span>
              </div>

              <button
                type="button"
                className={styles.copyBtn}
                onClick={handleCopyLink}
                title="Copy smartphone controller URL to clipboard"
              >
                <span>{copied ? '✓' : '🔗'}</span>
                <span>{copied ? 'COPIED!' : 'COPY LINK'}</span>
              </button>
            </div>

            {/* Right Column: Player Presets, Arena, and Actions */}
            <div className={styles.setupColumn}>
              {/* Player 1 & Player 2 Side-by-Side Grid */}
              <div className={styles.playersGrid}>
                {/* Player 1 Card */}
                <div className={styles.playerCardP1}>
                  <div className={styles.playerHeaderP1}>
                    <span>👑 PLAYER 1</span>
                    <span className={styles.playerTag}>
                      {partyState?.p1Connected ? 'READY' : 'LOCAL'}
                    </span>
                  </div>

                  {/* Dynamic Controller Status */}
                  {partyState?.p1Connected ? (
                    <div className={styles.statusBadgePhone}>
                      <span>📱 Phone 1 Connected</span>
                    </div>
                  ) : hasGamepad0 ? (
                    <div className={styles.statusBadgeGamepad}>
                      <span>🎮 Gamepad 1 Active</span>
                    </div>
                  ) : (
                    <div className={styles.statusBadgeKeyboard}>
                      <span>⌨️ Keyboard (WASD)</span>
                    </div>
                  )}

                  {/* Preset Selector */}
                  <div className={styles.selectGroup}>
                    <label htmlFor="p1PresetSelect" className={styles.label}>
                      WARRIOR:
                    </label>
                    <div className={styles.selectWrapper}>
                      <select
                        id="p1PresetSelect"
                        className={styles.select}
                        value={p1Preset}
                        onChange={e => setP1Preset(e.target.value)}
                      >
                        <option value="knight">Sir Cedric (Knight)</option>
                        <option value="marauder">Grimwood (Heavy)</option>
                        <option value="vanguard">Valerius (Vanguard)</option>
                        <option value="duelist">Aurelia (Duelist)</option>
                      </select>
                      <span className={styles.chevronDown} aria-hidden="true">
                        ▼
                      </span>
                    </div>
                  </div>
                </div>

                {/* Player 2 Card */}
                <div className={styles.playerCardP2}>
                  <div className={styles.playerHeaderP2}>
                    <span>⚔️ PLAYER 2</span>
                    <span className={styles.playerTag}>
                      {partyState?.p2Connected ? 'READY' : 'LOCAL'}
                    </span>
                  </div>

                  {/* Dynamic Controller Status */}
                  {partyState?.p2Connected ? (
                    <div className={styles.statusBadgePhone}>
                      <span>📱 Phone 2 Connected</span>
                    </div>
                  ) : hasGamepad1 ? (
                    <div className={styles.statusBadgeGamepad}>
                      <span>🎮 Gamepad 2 Active</span>
                    </div>
                  ) : (
                    <div className={styles.statusBadgeKeyboard}>
                      <span>⌨️ Keyboard (Arrows)</span>
                    </div>
                  )}

                  {/* Preset Selector */}
                  <div className={styles.selectGroup}>
                    <label htmlFor="p2PresetSelect" className={styles.label}>
                      WARRIOR:
                    </label>
                    <div className={styles.selectWrapper}>
                      <select
                        id="p2PresetSelect"
                        className={styles.select}
                        value={p2Preset}
                        onChange={e => setP2Preset(e.target.value)}
                      >
                        <option value="marauder">Grimwood (Heavy)</option>
                        <option value="knight">Sir Cedric (Knight)</option>
                        <option value="vanguard">Valerius (Vanguard)</option>
                        <option value="duelist">Aurelia (Duelist)</option>
                      </select>
                      <span className={styles.chevronDown} aria-hidden="true">
                        ▼
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Arena Battleground Selector */}
              <div className={styles.arenaRow}>
                <label htmlFor="arenaSelect" className={styles.label}>
                  ARENA:
                </label>
                <div className={styles.selectWrapper}>
                  <select
                    id="arenaSelect"
                    className={styles.select}
                    value={arenaId}
                    onChange={e => setArenaId(e.target.value)}
                  >
                    <option value="coloseum">Bastion Courtyard (Colosseum)</option>
                    <option value="dragonland">DragonLand</option>
                    <option value="stormforce">StormForce</option>
                    <option value="seaside">seaSide</option>
                  </select>
                  <span className={styles.chevronDown} aria-hidden="true">
                    ▼
                  </span>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className={styles.actionsRow}>
                <div className={styles.hintText}>
                  💡 Scan QR code with phones to claim Slot 1 &amp; 2!
                </div>

                <button
                  type="button"
                  className={styles.startBtn}
                  onClick={handleStartMatch}
                  title="Commence Local 2-Player Combat"
                >
                  <span>⚔️</span>
                  <span>START LOCAL DUEL</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
