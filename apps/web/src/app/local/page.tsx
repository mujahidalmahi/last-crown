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
          alignItems: 'center',
          justifyContent: 'center',
          color: '#f1c40f',
          fontFamily: 'monospace',
          fontSize: '1.2rem',
          zIndex: 9999,
        }}
      >
        FORGING COUCH CO-OP ARENA...
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
  const [arenaId, setArenaId] = useState('bastion_courtyard');

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

  // Connect Host and generate QR code
  useEffect(() => {
    if (!partyCode) return;

    const bridge = PartyControllerBridge.getInstance();
    let unmounted = false;

    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const fullUrl = `${origin}/controller?room=${partyCode}`;
    setControllerUrl(fullUrl);

    // Generate gold & dark QR Code
    QRCode.toDataURL(fullUrl, {
      margin: 1,
      width: 200,
      color: {
        dark: '#050810',
        light: '#f1c40f',
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
      <div className={styles.chamberContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>⚔️ LOCAL 2-PLAYER DUEL</h1>
          <p className={styles.subtitle}>
            1 Device &middot; 2 Controllers &middot; Play together on one screen with 2 Phones, 2
            Gamepads, or Keyboard!
          </p>
        </div>

        <div className={styles.mainGrid}>
          {/* QR Code Card */}
          <div className={styles.qrCard}>
            <p className={styles.qrInstruction}>SCAN WITH PHONE CAMERA TO PLAY AS CONTROLLER</p>
            <div className={styles.qrImageWrapper}>
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt={`Room QR Code for ${partyCode}`}
                  className={styles.qrImage}
                />
              ) : (
                <div
                  style={{
                    width: 200,
                    height: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Generating QR...
                </div>
              )}
            </div>

            <div className={styles.roomCodeBox}>
              ROOM CODE: <strong>{partyCode}</strong>
            </div>

            <button className={styles.copyBtn} onClick={handleCopyLink}>
              {copied ? '✓ COPIED!' : '📋 COPY CONTROLLER LINK'}
            </button>
          </div>

          {/* Controllers & Character Selection */}
          <div className={styles.controllersSection}>
            <div className={styles.playersGrid}>
              {/* Player 1 Card */}
              <div className={styles.playerCard}>
                <div className={styles.cardHeaderP1}>
                  <span>👑 PLAYER 1</span>
                  <span>{partyState?.p1Connected ? 'READY' : 'SELECT'}</span>
                </div>

                <div className={styles.deviceStatusList}>
                  <div
                    className={partyState?.p1Connected ? styles.deviceActive : styles.deviceIdle}
                  >
                    <span>{partyState?.p1Connected ? '●' : '○'}</span>
                    <span>📱 Phone 1: {partyState?.p1Connected ? 'Connected' : 'Waiting...'}</span>
                  </div>
                  <div className={hasGamepad0 ? styles.deviceActive : styles.deviceIdle}>
                    <span>{hasGamepad0 ? '●' : '○'}</span>
                    <span>🎮 Gamepad 1: {hasGamepad0 ? 'Detected' : 'Plug in USB/BT'}</span>
                  </div>
                  <div className={styles.deviceActive}>
                    <span>●</span>
                    <span>⌨️ Keyboard: WASD + Space + J/K/L</span>
                  </div>
                </div>

                <div className={styles.selectGroup}>
                  <label className={styles.label}>WARRIOR PRESET:</label>
                  <select
                    className={styles.select}
                    value={p1Preset}
                    onChange={e => setP1Preset(e.target.value)}
                  >
                    <option value="knight">Sir Cedric (Knight)</option>
                    <option value="marauder">Grimwood (Heavy)</option>
                    <option value="vanguard">Valerius (Vanguard)</option>
                    <option value="duelist">Aurelia (Duelist)</option>
                  </select>
                </div>
              </div>

              {/* Player 2 Card */}
              <div className={styles.playerCard}>
                <div className={styles.cardHeaderP2}>
                  <span>⚔️ PLAYER 2</span>
                  <span>{partyState?.p2Connected ? 'READY' : 'SELECT'}</span>
                </div>

                <div className={styles.deviceStatusList}>
                  <div
                    className={partyState?.p2Connected ? styles.deviceActive : styles.deviceIdle}
                  >
                    <span>{partyState?.p2Connected ? '●' : '○'}</span>
                    <span>📱 Phone 2: {partyState?.p2Connected ? 'Connected' : 'Waiting...'}</span>
                  </div>
                  <div className={hasGamepad1 ? styles.deviceActive : styles.deviceIdle}>
                    <span>{hasGamepad1 ? '●' : '○'}</span>
                    <span>🎮 Gamepad 2: {hasGamepad1 ? 'Detected' : 'Plug in USB/BT'}</span>
                  </div>
                  <div className={styles.deviceActive}>
                    <span>●</span>
                    <span>⌨️ Keyboard: Arrows + Numpad</span>
                  </div>
                </div>

                <div className={styles.selectGroup}>
                  <label className={styles.label}>WARRIOR PRESET:</label>
                  <select
                    className={styles.select}
                    value={p2Preset}
                    onChange={e => setP2Preset(e.target.value)}
                  >
                    <option value="marauder">Grimwood (Heavy)</option>
                    <option value="knight">Sir Cedric (Knight)</option>
                    <option value="vanguard">Valerius (Vanguard)</option>
                    <option value="duelist">Aurelia (Duelist)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Arena Selection */}
            <div className={styles.selectGroup}>
              <label className={styles.label}>ARENA BATTLEGROUND:</label>
              <select
                className={styles.select}
                value={arenaId}
                onChange={e => setArenaId(e.target.value)}
              >
                <option value="bastion_courtyard">Bastion Courtyard (Colosseum)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className={styles.actionsFooter}>
          <button className={styles.backBtn} onClick={() => router.push('/')}>
            ← BACK TO MENU
          </button>

          <div className={styles.tipBanner}>
            💡 Tip: When phones scan the QR code, they automatically claim Slot 1 &amp; 2!
          </div>

          <button className={styles.startBtn} onClick={handleStartMatch}>
            ⚔️ START LOCAL DUEL
          </button>
        </div>
      </div>
    </div>
  );
}
