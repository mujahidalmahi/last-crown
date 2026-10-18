'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TouchInputBridge } from '../../game/input/TouchInputBridge';
import styles from './MobileGameControls.module.css';

interface MobileGameControlsProps {
  isPortrait?: boolean; // kept for API compat, but ignored — always landscape overlay
}

export const MobileGameControls: React.FC<MobileGameControlsProps> = () => {
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);
  const [autoJump, setAutoJump] = useState<boolean>(false);

  // Clean up autoJump on unmount
  useEffect(() => {
    return () => {
      TouchInputBridge.setAutoJump(false);
      TouchInputBridge.reset();
    };
  }, []);

  // Direction and action state tracked in ref to avoid multi-touch stale closures and re-render lag
  const directionsRef = useRef({ up: false, down: false, left: false, right: false });

  // Visual active state for retro button press indicators
  const [activeVisuals, setActiveVisuals] = useState<{
    up: boolean;
    left: boolean;
    right: boolean;
    dash: boolean;
    block: boolean;
    parry: boolean;
    heavy: boolean;
    light: boolean;
  }>({
    up: false,
    left: false,
    right: false,
    dash: false,
    block: false,
    parry: false,
    heavy: false,
    light: false,
  });

  // Device detection: rely strictly on pointer coarse / maxTouchPoints, not desktop window width
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkDevice = () => {
      const hasTouch =
        (navigator.maxTouchPoints > 0 &&
          window.matchMedia &&
          window.matchMedia('(pointer: coarse)').matches) ||
        ('ontouchstart' in window &&
          window.matchMedia &&
          window.matchMedia('(hover: none)').matches);
      setIsTouchDevice(Boolean(hasTouch));
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  const triggerHaptic = useCallback((ms: number = 10) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // ignore
      }
    }
  }, []);

  const updateDirection = useCallback((delta: Partial<typeof directionsRef.current>) => {
    Object.assign(directionsRef.current, delta);
    TouchInputBridge.setDirection({ ...directionsRef.current });
  }, []);

  // ── LEFT BUTTONS ──

  const handleLeftDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      updateDirection({ left: true, right: false });
      setActiveVisuals(prev => ({ ...prev, left: true, right: false }));
      triggerHaptic(8);
    },
    [updateDirection, triggerHaptic]
  );

  const handleLeftUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      updateDirection({ left: false });
      setActiveVisuals(prev => ({ ...prev, left: false }));
    },
    [updateDirection]
  );

  const handleRightDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      updateDirection({ right: true, left: false });
      setActiveVisuals(prev => ({ ...prev, right: true, left: false }));
      triggerHaptic(8);
    },
    [updateDirection, triggerHaptic]
  );

  const handleRightUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      updateDirection({ right: false });
      setActiveVisuals(prev => ({ ...prev, right: false }));
    },
    [updateDirection]
  );

  const handleJumpDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      updateDirection({ up: true });
      TouchInputBridge.setJump(true);
      setActiveVisuals(prev => ({ ...prev, up: true }));
      triggerHaptic(10);
    },
    [updateDirection, triggerHaptic]
  );

  const handleJumpUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      updateDirection({ up: false });
      TouchInputBridge.setJump(false);
      setActiveVisuals(prev => ({ ...prev, up: false }));
    },
    [updateDirection]
  );

  const handleToggleAutoJump = useCallback(
    (e: React.PointerEvent | React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setAutoJump(prev => {
        const next = !prev;
        TouchInputBridge.setAutoJump(next);
        return next;
      });
      triggerHaptic(15);
    },
    [triggerHaptic]
  );

  // ── DASH ──
  const handleDashDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setActiveVisuals(prev => ({ ...prev, dash: true }));
      TouchInputBridge.triggerDash();
      triggerHaptic(12);
    },
    [triggerHaptic]
  );
  const handleDashUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setActiveVisuals(prev => ({ ...prev, dash: false }));
  }, []);

  // ── DEFENSE ──
  const handleBlockDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setActiveVisuals(prev => ({ ...prev, block: true }));
      TouchInputBridge.setBlock(true);
      triggerHaptic(8);
    },
    [triggerHaptic]
  );
  const handleBlockUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setActiveVisuals(prev => ({ ...prev, block: false }));
    TouchInputBridge.setBlock(false);
  }, []);

  const handleParryDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setActiveVisuals(prev => ({ ...prev, parry: true }));
      TouchInputBridge.triggerParry();
      triggerHaptic(14);
    },
    [triggerHaptic]
  );
  const handleParryUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setActiveVisuals(prev => ({ ...prev, parry: false }));
  }, []);

  // ── ATTACK ──
  const handleLightDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setActiveVisuals(prev => ({ ...prev, light: true }));
      TouchInputBridge.triggerLightAttack();
      triggerHaptic(10);
    },
    [triggerHaptic]
  );
  const handleLightUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setActiveVisuals(prev => ({ ...prev, light: false }));
  }, []);

  const handleHeavyDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setActiveVisuals(prev => ({ ...prev, heavy: true }));
      TouchInputBridge.triggerHeavyAttack();
      triggerHaptic(14);
    },
    [triggerHaptic]
  );
  const handleHeavyUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setActiveVisuals(prev => ({ ...prev, heavy: false }));
  }, []);

  if (!isTouchDevice) {
    return null;
  }

  return (
    <div
      className={styles.gamepad}
      role="region"
      aria-label="Arcade Virtual Gamepad"
      style={{ touchAction: 'none' }}
    >
      {/* ═══════════════════════════════════════════
          LEFT ZONE — Movement & Jump
          ═══════════════════════════════════════════ */}
      <div className={styles.leftZone}>
        {/* JUMP & AUTO JUMP — top row of left zone */}
        <div className={styles.jumpRow}>
          <button
            type="button"
            className={`${styles.jumpBtn} ${activeVisuals.up ? styles.active : ''}`}
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
            className={`${styles.autoJumpBtn} ${autoJump ? styles.autoJumpActive : ''}`}
            onPointerDown={handleToggleAutoJump}
            aria-label={
              autoJump ? 'Auto Jump Active (Tap to Disable)' : 'Auto Jump Inactive (Tap to Enable)'
            }
            aria-pressed={autoJump}
          >
            <span className={styles.btnIcon}>{autoJump ? '⚡' : '⟳'}</span>
            <span className={styles.btnLabel}>{autoJump ? 'AUTO ON' : 'AUTO'}</span>
          </button>
        </div>

        {/* LEFT + DASH + RIGHT — bottom row */}
        <div className={styles.lrRow}>
          <button
            type="button"
            className={`${styles.moveBtn} ${activeVisuals.left ? styles.active : ''}`}
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
            className={`${styles.dashBtn} ${activeVisuals.dash ? styles.active : ''}`}
            onPointerDown={handleDashDown}
            onPointerUp={handleDashUp}
            onPointerCancel={handleDashUp}
            onPointerLeave={handleDashUp}
            aria-label="Dash"
          >
            <span className={styles.btnIcon}>»</span>
            <span className={styles.btnLabel}>DASH</span>
          </button>

          <button
            type="button"
            className={`${styles.moveBtn} ${activeVisuals.right ? styles.active : ''}`}
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
      </div>

      {/* ═══════════════════════════════════════════
          RIGHT ZONE — Defense & Attack
          ═══════════════════════════════════════════ */}
      <div className={styles.rightZone}>
        {/* Defense row on top */}
        <div className={styles.defRow}>
          <button
            type="button"
            className={`${styles.blockBtn} ${activeVisuals.block ? styles.active : ''}`}
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
            className={`${styles.parryBtn} ${activeVisuals.parry ? styles.active : ''}`}
            onPointerDown={handleParryDown}
            onPointerUp={handleParryUp}
            onPointerCancel={handleParryUp}
            onPointerLeave={handleParryUp}
            aria-label="Parry"
          >
            <span className={styles.btnIcon}>◈</span>
            <span className={styles.btnLabel}>PARRY</span>
          </button>
        </div>

        {/* Attack row on bottom — larger buttons for primary actions */}
        <div className={styles.atkRow}>
          <button
            type="button"
            className={`${styles.heavyBtn} ${activeVisuals.heavy ? styles.active : ''}`}
            onPointerDown={handleHeavyDown}
            onPointerUp={handleHeavyUp}
            onPointerCancel={handleHeavyUp}
            onPointerLeave={handleHeavyUp}
            aria-label="Heavy Strike"
          >
            <span className={styles.btnIcon}>★</span>
            <span className={styles.btnLabel}>HEAVY</span>
          </button>

          <button
            type="button"
            className={`${styles.lightBtn} ${activeVisuals.light ? styles.active : ''}`}
            onPointerDown={handleLightDown}
            onPointerUp={handleLightUp}
            onPointerCancel={handleLightUp}
            onPointerLeave={handleLightUp}
            aria-label="Light Attack"
          >
            <span className={styles.btnIcon}>†</span>
            <span className={styles.btnLabel}>LIGHT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
