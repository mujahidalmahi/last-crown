'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PartyControllerBridge } from '../../game/input/PartyControllerBridge';
import { PartySlotState, PlayerInputMessage, AttackType } from '@last-crown/shared';
import { requestBrowserFullscreen } from '../../utils/fullscreen';
import styles from './controller.module.css';

function ControllerContent() {
  const searchParams = useSearchParams();
  const roomCode = searchParams.get('room') || 'CROWN';
  const preferredSlot = (searchParams.get('slot') as 'p1' | 'p2') || undefined;

  const [hasStarted, setHasStarted] = useState(false);
  const [partyState, setPartyState] = useState<PartySlotState | null>(null);
  const [assignedSlot, setAssignedSlot] = useState<'p1' | 'p2' | 'spectator'>('p1');
  const [isConnected, setIsConnected] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [autoJump, setAutoJump] = useState(false);

  // Direction and action tracking in refs to avoid multi-touch stale closures
  const directionsRef = useRef({ up: false, down: false, left: false, right: false });
  const activeBlockRef = useRef(false);
  const activeDashRef = useRef(false);
  const activeParryRef = useRef(false);
  const activeAttackRef = useRef<AttackType | null>(null);

  // Visual active states for retro button bevel depression
  const [activeVisuals, setActiveVisuals] = useState<{
    up: boolean;
    left: boolean;
    right: boolean;
    dash: boolean;
    block: boolean;
    parry: boolean;
    heavy: boolean;
    thrust: boolean;
    light: boolean;
  }>({
    up: false,
    left: false,
    right: false,
    dash: false,
    block: false,
    parry: false,
    heavy: false,
    thrust: false,
    light: false,
  });

  const bridgeRef = useRef<PartyControllerBridge>(PartyControllerBridge.getInstance());
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const inputSeqRef = useRef<number>(0);

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

  // Transmit input state to host via Colyseus
  const transmitInput = useCallback(
    (
      customAttack?: AttackType,
      customDash?: boolean,
      customParry?: boolean,
      customJump?: boolean
    ) => {
      const bridge = bridgeRef.current;
      if (!bridge.isConnected()) return;

      inputSeqRef.current++;

      let moveX = 0;
      if (directionsRef.current.left) moveX -= 1;
      if (directionsRef.current.right) moveX += 1;

      let moveY = 0;
      if (directionsRef.current.down) moveY += 1;
      if (directionsRef.current.up) moveY -= 1;

      const jump = customJump !== undefined ? customJump : autoJump || directionsRef.current.up;
      const block = activeBlockRef.current;
      const dash = customDash !== undefined ? customDash : activeDashRef.current;
      const parry = customParry !== undefined ? customParry : activeParryRef.current;

      const attackType = customAttack || activeAttackRef.current || undefined;
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
    [autoJump]
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

  // Screen wake lock
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

  // Auto Jump continuous loop
  useEffect(() => {
    if (!autoJump) return;
    transmitInput(undefined, undefined, undefined, true);
    const interval = setInterval(() => {
      transmitInput(undefined, undefined, undefined, true);
    }, 240);
    return () => clearInterval(interval);
  }, [autoJump, transmitInput]);

  // ── LEFT ZONE HANDLERS (POINTER EVENTS) ──

  const handleLeftDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      directionsRef.current.left = true;
      directionsRef.current.right = false;
      setActiveVisuals(prev => ({ ...prev, left: true, right: false }));
      vibrate(8);
      transmitInput();
    },
    [transmitInput, vibrate]
  );

  const handleLeftUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      directionsRef.current.left = false;
      setActiveVisuals(prev => ({ ...prev, left: false }));
      transmitInput();
    },
    [transmitInput]
  );

  const handleRightDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      directionsRef.current.right = true;
      directionsRef.current.left = false;
      setActiveVisuals(prev => ({ ...prev, right: true, left: false }));
      vibrate(8);
      transmitInput();
    },
    [transmitInput, vibrate]
  );

  const handleRightUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      directionsRef.current.right = false;
      setActiveVisuals(prev => ({ ...prev, right: false }));
      transmitInput();
    },
    [transmitInput]
  );

  const handleJumpDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      directionsRef.current.up = true;
      setActiveVisuals(prev => ({ ...prev, up: true }));
      vibrate(10);
      transmitInput(undefined, undefined, undefined, true);
    },
    [transmitInput, vibrate]
  );

  const handleJumpUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      directionsRef.current.up = false;
      setActiveVisuals(prev => ({ ...prev, up: false }));
      transmitInput();
    },
    [transmitInput]
  );

  const handleToggleAutoJump = useCallback(
    (e: React.PointerEvent | React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setAutoJump(prev => {
        const next = !prev;
        vibrate(15);
        if (!next) {
          transmitInput(undefined, undefined, undefined, false);
        }
        return next;
      });
    },
    [vibrate, transmitInput]
  );

  const handleDashDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      activeDashRef.current = true;
      setActiveVisuals(prev => ({ ...prev, dash: true }));
      vibrate(12);
      transmitInput(undefined, true);
      setTimeout(() => {
        activeDashRef.current = false;
        setActiveVisuals(prev => ({ ...prev, dash: false }));
        transmitInput(undefined, false);
      }, 90);
    },
    [transmitInput, vibrate]
  );

  // ── RIGHT ZONE HANDLERS (POINTER EVENTS) ──

  const handleBlockDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      activeBlockRef.current = true;
      setActiveVisuals(prev => ({ ...prev, block: true }));
      vibrate(10);
      transmitInput();
    },
    [transmitInput, vibrate]
  );

  const handleBlockUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      activeBlockRef.current = false;
      setActiveVisuals(prev => ({ ...prev, block: false }));
      transmitInput();
    },
    [transmitInput]
  );

  const handleParryDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      activeParryRef.current = true;
      setActiveVisuals(prev => ({ ...prev, parry: true }));
      vibrate(15);
      transmitInput(undefined, undefined, true);
      setTimeout(() => {
        activeParryRef.current = false;
        setActiveVisuals(prev => ({ ...prev, parry: false }));
        transmitInput(undefined, undefined, false);
      }, 80);
    },
    [transmitInput, vibrate]
  );

  const triggerAttack = useCallback(
    (type: AttackType) => {
      vibrate(type === 'heavy' ? 24 : 12);
      activeAttackRef.current = type;
      setActiveVisuals(prev => ({ ...prev, [type]: true }));
      transmitInput(type);
      setTimeout(() => {
        if (activeAttackRef.current === type) {
          activeAttackRef.current = null;
        }
        setActiveVisuals(prev => ({ ...prev, [type]: false }));
        transmitInput(undefined);
      }, 75);
    },
    [transmitInput, vibrate]
  );

  const handleReady = () => {
    vibrate(40);
    bridgeRef.current.sendStartMatch();
  };

  return (
    <div className={styles.controllerWrapper}>
      {/* Subtle CRT Scanline Texture */}
      <div className={styles.scanlineOverlay} />

      {/* Retro Medieval Start Modal */}
      {!hasStarted && (
        <div className={styles.modalBackdrop}>
          <div className={styles.stoneCard}>
            <h2 className={styles.plaqueTitle}>LAST-CROWN GAMEPAD</h2>
            <div className={styles.innerCanvas}>
              <p className={styles.modalSubtitle}>
                CONNECT SMARTPHONE AS CONTROLLER FOR ROOM{' '}
                <strong className={styles.roomCodeHighlight}>{roomCode}</strong>
              </p>
              <button type="button" className={styles.modalBtn} onClick={handleStartInteraction}>
                ⚔️ START CONTROLLER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Status Menubar matching Settings & Room aesthetic */}
      <header className={styles.topRibbon}>
        <button
          type="button"
          className={`${styles.slotBadge} ${assignedSlot === 'p1' ? styles.slotP1 : styles.slotP2}`}
          onClick={handleClaimOtherSlot}
          title="Tap to switch slot"
        >
          <span className={styles.badgeIcon}>{assignedSlot === 'p1' ? '👑' : '⚔️'}</span>
          <span>{assignedSlot === 'p1' ? 'PLAYER 1' : 'PLAYER 2'}</span>
          <span className={styles.switchHint}>⇄ SWITCH</span>
        </button>

        <div className={styles.roomTag}>
          ROOM: <strong className={styles.roomCodeText}>{roomCode}</strong>
          {partyState && (
            <span className={styles.roomCount}>
              {partyState.p1Connected && partyState.p2Connected ? '(2/2)' : '(1/2)'}
            </span>
          )}
        </div>

        <div className={styles.ribbonActions}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => setHapticsEnabled(!hapticsEnabled)}
            title="Toggle Haptic Feedback"
          >
            {hapticsEnabled ? '📳 ON' : '📴 OFF'}
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => requestBrowserFullscreen()}
            title="Toggle Fullscreen"
          >
            ⛶
          </button>
        </div>
      </header>

      {/* Main Gamepad Deck */}
      <main className={styles.controllerDeck}>
        {/* ═══════════════════════════════════════════
            LEFT ZONE — Movement, Jump & Auto Jump
            ═══════════════════════════════════════════ */}
        <section className={styles.leftCluster} aria-label="Movement Controls">
          {/* Top Row: Manual Jump + Auto Jump Toggle */}
          <div className={styles.jumpRow}>
            <button
              type="button"
              className={`${styles.btn} ${styles.jumpBtn} ${activeVisuals.up ? styles.active : ''}`}
              onPointerDown={handleJumpDown}
              onPointerUp={handleJumpUp}
              onPointerCancel={handleJumpUp}
              onPointerLeave={handleJumpUp}
              aria-label="Manual Jump"
            >
              <span className={styles.btnIcon}>↑</span>
              <span className={styles.btnLabel}>JUMP</span>
            </button>

            <button
              type="button"
              className={`${styles.btn} ${styles.autoJumpBtn} ${autoJump ? styles.autoJumpActive : ''}`}
              onPointerDown={handleToggleAutoJump}
              aria-label={
                autoJump
                  ? 'Auto Jump Active (Tap to Disable)'
                  : 'Auto Jump Inactive (Tap to Enable)'
              }
              aria-pressed={autoJump}
            >
              <span className={styles.btnIcon}>{autoJump ? '⚡' : '⟳'}</span>
              <span className={styles.btnLabel}>{autoJump ? 'AUTO ON' : 'AUTO'}</span>
            </button>
          </div>

          {/* Bottom Row: ◀ LEFT + » DASH + ▶ RIGHT */}
          <div className={styles.lrRow}>
            <button
              type="button"
              className={`${styles.btn} ${styles.moveBtn} ${activeVisuals.left ? styles.active : ''}`}
              onPointerDown={handleLeftDown}
              onPointerUp={handleLeftUp}
              onPointerCancel={handleLeftUp}
              onPointerLeave={handleLeftUp}
              aria-label="Move Left"
            >
              <span className={styles.btnIcon}>◀</span>
              <span className={styles.btnLabel}>LEFT</span>
            </button>

            <button
              type="button"
              className={`${styles.btn} ${styles.dashBtn} ${activeVisuals.dash ? styles.active : ''}`}
              onPointerDown={handleDashDown}
              aria-label="Dash"
            >
              <span className={styles.btnIcon}>»</span>
              <span className={styles.btnLabel}>DASH</span>
            </button>

            <button
              type="button"
              className={`${styles.btn} ${styles.moveBtn} ${activeVisuals.right ? styles.active : ''}`}
              onPointerDown={handleRightDown}
              onPointerUp={handleRightUp}
              onPointerCancel={handleRightUp}
              onPointerLeave={handleRightUp}
              aria-label="Move Right"
            >
              <span className={styles.btnIcon}>▶</span>
              <span className={styles.btnLabel}>RIGHT</span>
            </button>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            CENTER ZONE — Status & Duel Ready Button
            ═══════════════════════════════════════════ */}
        <section className={styles.centerDeck} aria-label="Game Status and Ready">
          <div className={styles.statusIndicator}>
            <span className={isConnected ? styles.connectedDot : styles.connectingDot}>
              {isConnected ? '●' : '○'}
            </span>
            <span className={styles.statusText}>{isConnected ? 'CONNECTED' : 'CONNECTING...'}</span>
          </div>

          <button type="button" className={styles.readyBtn} onClick={handleReady}>
            ⚔️ READY FOR DUEL
          </button>
        </section>

        {/* ═══════════════════════════════════════════
            RIGHT ZONE — Defense & Combat Strikes
            ═══════════════════════════════════════════ */}
        <section className={styles.rightCluster} aria-label="Combat Actions">
          {/* Top Row: Block & Parry */}
          <div className={styles.defRow}>
            <button
              type="button"
              className={`${styles.btn} ${styles.blockBtn} ${activeVisuals.block ? styles.active : ''}`}
              onPointerDown={handleBlockDown}
              onPointerUp={handleBlockUp}
              onPointerCancel={handleBlockUp}
              onPointerLeave={handleBlockUp}
              aria-label="Block"
            >
              <span className={styles.btnIcon}>▣</span>
              <span className={styles.btnLabel}>BLOCK</span>
            </button>

            <button
              type="button"
              className={`${styles.btn} ${styles.parryBtn} ${activeVisuals.parry ? styles.active : ''}`}
              onPointerDown={handleParryDown}
              aria-label="Parry"
            >
              <span className={styles.btnIcon}>◈</span>
              <span className={styles.btnLabel}>PARRY</span>
            </button>
          </div>

          {/* Bottom Row: Heavy Strike + Thrust + Light Slash */}
          <div className={styles.atkRow}>
            <button
              type="button"
              className={`${styles.btn} ${styles.heavyBtn} ${activeVisuals.heavy ? styles.active : ''}`}
              onPointerDown={() => triggerAttack('heavy')}
              aria-label="Heavy Strike"
            >
              <span className={styles.btnIcon}>★</span>
              <span className={styles.btnLabel}>HEAVY</span>
            </button>

            <button
              type="button"
              className={`${styles.btn} ${styles.thrustBtn} ${activeVisuals.thrust ? styles.active : ''}`}
              onPointerDown={() => triggerAttack('thrust')}
              aria-label="Thrust Attack"
            >
              <span className={styles.btnIcon}>🗡</span>
              <span className={styles.btnLabel}>THRUST</span>
            </button>

            <button
              type="button"
              className={`${styles.btn} ${styles.lightBtn} ${activeVisuals.light ? styles.active : ''}`}
              onPointerDown={() => triggerAttack('light')}
              aria-label="Light Attack"
            >
              <span className={styles.btnIcon}>†</span>
              <span className={styles.btnLabel}>LIGHT</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function MobileControllerPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.controllerWrapper}>
          <div className={styles.loadingFallback}>CONNECTING GAMEPAD...</div>
        </div>
      }
    >
      <ControllerContent />
    </Suspense>
  );
}
