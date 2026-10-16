'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
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
        <span style={{ fontSize: '3rem', filter: 'drop-shadow(0 0 12px #f1c40f)' }}>⚔️</span>
        <p>FORGING COUCH CO-OP ARENA...</p>
      </div>
    ),
  }
);

export default function LocalDuelPage() {
  const router = useRouter();
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

    // Generate gold & dark QR Code at 2x resolution (432px) so 216px display is 100% sharp
    QRCode.toDataURL(fullUrl, {
      margin: 1,
      width: 432,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#111622',
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
    <div className={styles.pageWrapper}>
      {/* Main Stone Frame Chamber */}
      <div className={styles.chamberContainer}>
        {/* Metallic Corner Plates with Screws */}
        <div className={styles.cornerRivetTL} aria-hidden="true" />
        <div className={styles.cornerRivetTR} aria-hidden="true" />
        <div className={styles.cornerRivetBL} aria-hidden="true" />
        <div className={styles.cornerRivetBR} aria-hidden="true" />

        {/* Mid-rail Rivets */}
        <div className={styles.borderRivetTop} aria-hidden="true" />
        <div className={styles.borderRivetBottom} aria-hidden="true" />

        {/* Moss & Ivy Accents */}
        <div className={styles.mossTL} aria-hidden="true" />
        <div className={styles.mossTR} aria-hidden="true" />
        <div className={styles.mossBL} aria-hidden="true" />
        <div className={styles.mossBR} aria-hidden="true" />
        <div className={styles.mossTopMid} aria-hidden="true" />
        <div className={styles.mossBottomMid} aria-hidden="true" />

        {/* Header */}
        <header className={styles.header}>
          <div className={styles.titleRow}>
            <span className={styles.swordsIcon} aria-hidden="true">
              ⚔️
            </span>
            <h1 className={styles.title}>LOCAL 2-PLAYER DUEL</h1>
          </div>
          <p className={styles.subtitle}>
            1 Device &middot; 2 Controllers - Play together on one screen with 2 Phones, 2 Gamepads,
            or Keyboard!
          </p>
        </header>

        {/* Main 2-Column Grid */}
        <div className={styles.mainGrid}>
          {/* Left Column: QR Card */}
          <div className={styles.qrCard} role="region" aria-label="Smartphone Controller Setup">
            <div className={styles.cardRivetTL} aria-hidden="true" />
            <div className={styles.cardRivetTR} aria-hidden="true" />
            <div className={styles.cardRivetBL} aria-hidden="true" />
            <div className={styles.cardRivetBR} aria-hidden="true" />
            <div className={styles.cardMossTL} aria-hidden="true" />

            <p className={styles.qrInstruction}>SCAN WITH PHONE CAMERA TO PLAY AS CONTROLLER</p>

            {/* Dedicated Space ONLY for QR Code (Never blurry) */}
            <div className={styles.qrImageWrapper}>
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt={`Room QR Code for Party ${partyCode}`}
                  className={styles.qrImage}
                />
              ) : (
                <div className={styles.qrGenerating}>GENERATING QR...</div>
              )}
            </div>

            <div className={styles.roomCodeBox}>
              ROOM CODE: <span className={styles.roomCodeValue}>{partyCode || '----'}</span>
            </div>

            <button
              type="button"
              className={styles.copyBtn}
              onClick={handleCopyLink}
              title="Copy smartphone controller URL to clipboard"
            >
              <span>{copied ? '✓' : '🔗'}</span>
              <span>{copied ? 'COPIED!' : 'COPY CONTROLLER LINK'}</span>
            </button>
          </div>

          {/* Right Column: Controllers & Preset Panels */}
          <div className={styles.controllersSection}>
            <div className={styles.playersGrid}>
              {/* Player 1 Card */}
              <div className={styles.playerCard}>
                <div className={styles.cardRivetTL} aria-hidden="true" />
                <div className={styles.cardRivetTR} aria-hidden="true" />
                <div className={styles.cardRivetBL} aria-hidden="true" />
                <div className={styles.cardRivetBR} aria-hidden="true" />
                <div className={styles.cardMossTL} aria-hidden="true" />

                <div className={styles.cardHeaderP1}>
                  <span>👑 PLAYER 1</span>
                  <span className={styles.selectTag}>
                    {partyState?.p1Connected ? 'READY' : 'SELECT'}
                  </span>
                </div>

                <div className={styles.deviceStatusList}>
                  <div
                    className={`${styles.deviceItem} ${
                      partyState?.p1Connected ? styles.deviceActive : styles.deviceWaiting
                    }`}
                  >
                    <span
                      className={
                        partyState?.p1Connected
                          ? styles.statusBulletActive
                          : styles.statusBulletWaiting
                      }
                    >
                      {partyState?.p1Connected ? '●' : '▢'}
                    </span>
                    <span>📱 Phone 1: {partyState?.p1Connected ? 'Connected' : 'Waiting...'}</span>
                  </div>

                  <div
                    className={`${styles.deviceItem} ${
                      hasGamepad0 ? styles.deviceActive : styles.deviceWaiting
                    }`}
                  >
                    <span
                      className={
                        hasGamepad0 ? styles.statusBulletActive : styles.statusBulletWaiting
                      }
                    >
                      {hasGamepad0 ? '●' : '▢'}
                    </span>
                    <span>🎮 Gamepad 1: {hasGamepad0 ? 'Connected' : 'Plug in USB/BT'}</span>
                  </div>

                  <div className={`${styles.deviceItem} ${styles.deviceActive}`}>
                    <span className={styles.statusBulletActive}>●</span>
                    <span>⌨️ Keyboard: WASD + Space + J/K/L</span>
                  </div>
                </div>

                <div className={styles.selectGroup}>
                  <label htmlFor="p1PresetSelect" className={styles.label}>
                    WARRIOR PRESET:
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
              <div className={styles.playerCard}>
                <div className={styles.cardRivetTL} aria-hidden="true" />
                <div className={styles.cardRivetTR} aria-hidden="true" />
                <div className={styles.cardRivetBL} aria-hidden="true" />
                <div className={styles.cardRivetBR} aria-hidden="true" />
                <div className={styles.cardMossBR} aria-hidden="true" />

                <div className={styles.cardHeaderP2}>
                  <span>⚔️ PLAYER 2</span>
                  <span className={styles.selectTag}>
                    {partyState?.p2Connected ? 'READY' : 'SELECT'}
                  </span>
                </div>

                <div className={styles.deviceStatusList}>
                  <div
                    className={`${styles.deviceItem} ${
                      partyState?.p2Connected ? styles.deviceActive : styles.deviceWaiting
                    }`}
                  >
                    <span
                      className={
                        partyState?.p2Connected
                          ? styles.statusBulletActive
                          : styles.statusBulletWaiting
                      }
                    >
                      {partyState?.p2Connected ? '●' : '▢'}
                    </span>
                    <span>📱 Phone 2: {partyState?.p2Connected ? 'Connected' : 'Waiting...'}</span>
                  </div>

                  <div
                    className={`${styles.deviceItem} ${
                      hasGamepad1 ? styles.deviceActive : styles.deviceWaiting
                    }`}
                  >
                    <span
                      className={
                        hasGamepad1 ? styles.statusBulletActive : styles.statusBulletWaiting
                      }
                    >
                      {hasGamepad1 ? '●' : '▢'}
                    </span>
                    <span>🎮 Gamepad 2: {hasGamepad1 ? 'Connected' : 'Plug in USB/BT'}</span>
                  </div>

                  <div className={`${styles.deviceItem} ${styles.deviceActive}`}>
                    <span className={styles.statusBulletActive}>●</span>
                    <span>⌨️ Keyboard: Arrows + Numpad</span>
                  </div>
                </div>

                <div className={styles.selectGroup}>
                  <label htmlFor="p2PresetSelect" className={styles.label}>
                    WARRIOR PRESET:
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

            {/* Arena Selection */}
            <div className={styles.arenaSection}>
              <div className={styles.cardRivetTL} aria-hidden="true" />
              <div className={styles.cardRivetTR} aria-hidden="true" />
              <div className={styles.cardRivetBL} aria-hidden="true" />
              <div className={styles.cardRivetBR} aria-hidden="true" />
              <div className={styles.cardMossTL} aria-hidden="true" />
              <label htmlFor="arenaSelect" className={styles.label}>
                ARENA BATTLEGROUND:
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
          </div>
        </div>

        {/* Footer Actions */}
        <footer className={styles.actionsFooter}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => router.push('/')}
            title="Return to Main Menu"
          >
            ← BACK TO MENU
          </button>

          <div className={styles.tipBanner}>
            <span className={styles.tipIcon} aria-hidden="true">
              💡
            </span>
            <span>Tip: When phones scan the QR code, they automatically claim Slot 1 &amp; 2!</span>
          </div>

          <button
            type="button"
            className={styles.startBtn}
            onClick={handleStartMatch}
            title="Commence Local 2-Player Combat"
          >
            <span aria-hidden="true">⚔️</span>
            <span>START LOCAL DUEL</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
