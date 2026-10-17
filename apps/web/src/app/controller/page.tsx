'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { PartyControllerBridge } from '../../game/input/PartyControllerBridge';
import { PartySlotState, PlayerInputMessage, AttackType } from '@last-crown/shared';
import { requestBrowserFullscreen } from '../../utils/fullscreen';
import styles from './controller.module.css';

export default function MobileControllerPage() {
  const searchParams = useSearchParams();
  const roomCode = searchParams.get('room') || 'CROWN';
  const preferredSlot = (searchParams.get('slot') as 'p1' | 'p2') || undefined;

  const [hasStarted, setHasStarted] = useState(false);
  const [partyState, setPartyState] = useState<PartySlotState | null>(null);
  const [assignedSlot, setAssignedSlot] = useState<'p1' | 'p2' | 'spectator'>('p1');
  const [isConnected, setIsConnected] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  // Active touch states
  const [activeDpad, setActiveDpad] = useState<{
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
  }>({
    up: false,
    down: false,
    left: false,
    right: false,
  });
  const [activeBlock, setActiveBlock] = useState(false);
  const [activeDash, setActiveDash] = useState(false);
  const [activeParry, setActiveParry] = useState(false);
  const [activeAttack, setActiveAttack] = useState<AttackType | null>(null);

  const bridgeRef = useRef<PartyControllerBridge>(PartyControllerBridge.getInstance());
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const inputSeqRef = useRef<number>(0);
  const dpadRef = useRef<HTMLDivElement>(null);

  // Trigger haptic vibration safely
  const vibrate = useCallback(
    (pattern: number | number[]) => {
      if (!hapticsEnabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
      try {
        navigator.vibrate(pattern);
      } catch {
        // Handled gracefully
      }
    },
    [hapticsEnabled]
  );

  // Transmit input state to host
  const transmitInput = useCallback(
    (customAttack?: AttackType, customDash?: boolean, customParry?: boolean) => {
      const bridge = bridgeRef.current;
      if (!bridge.isConnected()) return;

      inputSeqRef.current++;

      let moveX = 0;
      if (activeDpad.left) moveX -= 1;
      if (activeDpad.right) moveX += 1;

      let moveY = 0;
      if (activeDpad.down) moveY += 1;
      if (activeDpad.up) moveY -= 1;

      const jump = activeDpad.up;
      const block = activeBlock;
      const dash = customDash !== undefined ? customDash : activeDash;
      const parry = customParry !== undefined ? customParry : activeParry;

      const attackType = customAttack || activeAttack || undefined;
      const attack = !!attackType;

      const payload: PlayerInputMessage = {
        sequence: inputSeqRef.current,
        timestamp: Date.now(),
        moveX,
        moveY,
        jump,
        attack,
        attackType,
        block,
        parry,
        dash,
      };

      bridge.sendControllerInput(payload);
    },
    [activeDpad, activeBlock, activeDash, activeParry, activeAttack]
  );

  // Setup connection to Colyseus party room
  useEffect(() => {
    let unmounted = false;
    const bridge = bridgeRef.current;

    async function init() {
      try {
        await bridge.connectController(roomCode, preferredSlot);
        if (unmounted) return;
        setIsConnected(true);

        bridge.onPartyState(state => {
          if (unmounted) return;
          setPartyState(state);
          if (state.assignedSlot) {
            setAssignedSlot(state.assignedSlot);
          }
        });

        bridge.onVibrate(msg => {
          if (msg.pattern) {
            vibrate(msg.pattern);
          } else if (msg.type === 'hit') {
            vibrate([60, 40, 60]);
          } else if (msg.type === 'parry') {
            vibrate(90);
          } else if (msg.type === 'win') {
            vibrate([100, 50, 100, 50, 200]);
          }
        });
      } catch (err) {
        console.error('Failed to connect controller:', err);
      }
    }

    init();

    return () => {
      unmounted = true;
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
      bridge.disconnect();
    };
  }, [roomCode, preferredSlot, vibrate]);

  // Request screen wake lock
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch {
      // Handled gracefully
    }
  };

  const handleStartInteraction = async () => {
    try {
      await requestBrowserFullscreen();
    } catch {
      // Handled gracefully
    }
    await requestWakeLock();
    vibrate(30);
    setHasStarted(true);
  };

  const handleClaimOtherSlot = () => {
    const nextSlot = assignedSlot === 'p1' ? 'p2' : 'p1';
    bridgeRef.current.sendClaimSlot(nextSlot);
    vibrate(20);
  };

  // D-Pad Touch Handling
  const handleDpadTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!dpadRef.current) return;
    const rect = dpadRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const touch = e.touches[0];
    if (!touch) return;

    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    const deadzone = 18;

    const left = dx < -deadzone;
    const right = dx > deadzone;
    const up = dy < -deadzone;
    const down = dy > deadzone;

    setActiveDpad({ up, down, left, right });
    vibrate(10);
  };

  const handleDpadEnd = () => {
    setActiveDpad({ up: false, down: false, left: false, right: false });
  };

  useEffect(() => {
    transmitInput();
  }, [activeDpad, activeBlock, transmitInput]);

  // Attack Trigger with auto-release
  const triggerAttack = (type: AttackType) => {
    vibrate(25);
    setActiveAttack(type);
    transmitInput(type);
    setTimeout(() => {
      setActiveAttack(null);
      transmitInput(undefined);
    }, 70);
  };

  // Parry Trigger
  const triggerParry = () => {
    vibrate(25);
    setActiveParry(true);
    transmitInput(undefined, undefined, true);
    setTimeout(() => {
      setActiveParry(false);
      transmitInput(undefined, undefined, false);
    }, 70);
  };

  // Dash Trigger
  const triggerDash = () => {
    vibrate(20);
    setActiveDash(true);
    transmitInput(undefined, true);
    setTimeout(() => {
      setActiveDash(false);
      transmitInput(undefined, false);
    }, 90);
  };

  // Signal Ready to Start
  const handleReady = () => {
    vibrate(40);
    bridgeRef.current.sendStartMatch();
  };

  return (
    <div className={styles.controllerWrapper}>
      {/* Tap to Activate Modal for Audio & Fullscreen */}
      {!hasStarted && (
        <div className={styles.modalBackdrop}>
          <h2
            className={styles.modalTitle}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <img
              src="/icon.png"
              alt=""
              width={24}
              height={24}
              style={{ imageRendering: 'pixelated' }}
            />
            <span>LAST-CROWN GAMEPAD</span>
          </h2>
          <p className={styles.modalSubtitle}>
            Tap below to pair your smartphone as a responsive controller for Room{' '}
            <strong style={{ color: '#f1c40f' }}>{roomCode}</strong>.
          </p>
          <button className={styles.modalBtn} onClick={handleStartInteraction}>
            START CONTROLLER
          </button>
        </div>
      )}

      {/* Top Status Ribbon */}
      <div className={styles.topRibbon}>
        <div
          className={`${styles.slotBadge} ${assignedSlot === 'p1' ? styles.slotP1 : styles.slotP2}`}
          onClick={handleClaimOtherSlot}
          title="Tap to switch slot"
        >
          <span>{assignedSlot === 'p1' ? '👑' : '⚔️'}</span>
          <span>{assignedSlot === 'p1' ? 'PLAYER 1' : 'PLAYER 2'}</span>
          <span style={{ fontSize: '0.55rem', opacity: 0.7 }}>⇄</span>
        </div>

        <div className={styles.roomTag}>
          ROOM: <strong>{roomCode}</strong>
          {partyState && (
            <span style={{ marginLeft: '6px', fontSize: '0.55rem', opacity: 0.8 }}>
              {partyState.p1Connected && partyState.p2Connected ? '(2/2)' : '(1/2)'}
            </span>
          )}
        </div>

        <div className={styles.ribbonActions}>
          <button
            className={styles.iconBtn}
            onClick={() => setHapticsEnabled(!hapticsEnabled)}
            title="Toggle Haptic Feedback"
          >
            {hapticsEnabled ? '📳 ON' : '📴 OFF'}
          </button>
          <button
            className={styles.iconBtn}
            onClick={() => requestBrowserFullscreen()}
            title="Fullscreen"
          >
            ⛶
          </button>
        </div>
      </div>

      {/* Main Controller Deck */}
      <div className={styles.controllerDeck}>
        {/* Left Thumb: 4-Way D-Pad + Dash */}
        <div className={styles.leftCluster}>
          <div
            ref={dpadRef}
            className={styles.dpad}
            onTouchStart={handleDpadTouch}
            onTouchMove={handleDpadTouch}
            onTouchEnd={handleDpadEnd}
            onTouchCancel={handleDpadEnd}
          >
            <div className={styles.dpadCenter} />
            <div
              className={`${styles.dpadBtn} ${styles.dpadUp} ${activeDpad.up ? styles.dpadActive : ''}`}
            >
              ▲
            </div>
            <div
              className={`${styles.dpadBtn} ${styles.dpadDown} ${activeDpad.down ? styles.dpadActive : ''}`}
            >
              ▼
            </div>
            <div
              className={`${styles.dpadBtn} ${styles.dpadLeft} ${activeDpad.left ? styles.dpadActive : ''}`}
            >
              ◄
            </div>
            <div
              className={`${styles.dpadBtn} ${styles.dpadRight} ${activeDpad.right ? styles.dpadActive : ''}`}
            >
              ►
            </div>
          </div>

          <button
            className={`${styles.dashBtn} ${activeDash ? styles.dashActive : ''}`}
            onTouchStart={triggerDash}
          >
            ⚡ DASH
          </button>
        </div>

        {/* Center: Status & Ready Button */}
        <div className={styles.centerDeck}>
          <div className={styles.statusIndicator}>
            <span>{isConnected ? '●' : '○'}</span>
            <span>{isConnected ? 'CONNECTED' : 'CONNECTING...'}</span>
          </div>

          <button className={styles.readyBtn} onClick={handleReady}>
            ⚔️ READY
          </button>
        </div>

        {/* Right Thumb: 5-Button Action Diamond */}
        <div className={styles.rightCluster}>
          <div className={styles.combatDiamond}>
            {/* Heavy Strike (North) */}
            <button
              className={`${styles.actionBtn} ${styles.btnHeavy} ${activeAttack === 'heavy' ? styles.heavyActive : ''}`}
              onTouchStart={() => triggerAttack('heavy')}
            >
              <span className={styles.btnIcon}>💥</span>
              <span>HEAVY</span>
            </button>

            {/* Light Slash (East) */}
            <button
              className={`${styles.actionBtn} ${styles.btnLight} ${activeAttack === 'light' ? styles.lightActive : ''}`}
              onTouchStart={() => triggerAttack(activeDpad.down ? 'sweep' : 'light')}
            >
              <span className={styles.btnIcon}>⚔️</span>
              <span>{activeDpad.down ? 'SWEEP' : 'LIGHT'}</span>
            </button>

            {/* Forward Thrust (South) */}
            <button
              className={`${styles.actionBtn} ${styles.btnThrust} ${activeAttack === 'thrust' ? styles.thrustActive : ''}`}
              onTouchStart={() => triggerAttack('thrust')}
            >
              <span className={styles.btnIcon}>🗡️</span>
              <span>THRUST</span>
            </button>

            {/* Parry / Riposte (West) */}
            <button
              className={`${styles.actionBtn} ${styles.btnParry} ${activeParry ? styles.parryActive : ''}`}
              onTouchStart={triggerParry}
            >
              <span className={styles.btnIcon}>⚡</span>
              <span>PARRY</span>
            </button>

            {/* Guard / Block (Center Diamond - Holdable) */}
            <button
              className={`${styles.actionBtn} ${styles.btnBlock} ${activeBlock ? styles.blockActive : ''}`}
              onTouchStart={() => {
                vibrate(15);
                setActiveBlock(true);
              }}
              onTouchEnd={() => setActiveBlock(false)}
              onTouchCancel={() => setActiveBlock(false)}
            >
              <span className={styles.btnIcon}>🛡️</span>
              <span>BLOCK</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
