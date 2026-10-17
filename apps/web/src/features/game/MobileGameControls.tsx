'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TouchInputBridge } from '../../game/input/TouchInputBridge';
import styles from './MobileGameControls.module.css';

interface MobileGameControlsProps {
  isPortrait?: boolean; // kept for API compat, but ignored — always landscape overlay
}

export const MobileGameControls: React.FC<MobileGameControlsProps> = () => {
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);
  const [activeDirections, setActiveDirections] = useState<{
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
  }>({ up: false, down: false, left: false, right: false });

  const [activeActions, setActiveActions] = useState<{
    light: boolean;
    heavy: boolean;
    block: boolean;
    parry: boolean;
    dash: boolean;
  }>({
    light: false,
    heavy: false,
    block: false,
    parry: false,
    dash: false,
  });

  // Device detection
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkDevice = () => {
      const hasTouch =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        (window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches) ||
        window.innerWidth <= 1024;
      setIsTouchDevice(hasTouch);
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

  const updateDirectionState = useCallback(
    (up: boolean, down: boolean, left: boolean, right: boolean) => {
      setActiveDirections({ up, down, left, right });
      TouchInputBridge.setDirection({ up, down, left, right });
    },
    []
  );

  // ── LEFT BUTTONS ──

  const handleLeftDown = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      updateDirectionState(activeDirections.up, false, true, false);
      triggerHaptic(8);
    },
    [activeDirections.up, updateDirectionState, triggerHaptic]
  );

  const handleLeftUp = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      updateDirectionState(activeDirections.up, false, false, activeDirections.right);
    },
    [activeDirections, updateDirectionState]
  );

  const handleRightDown = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      updateDirectionState(activeDirections.up, false, false, true);
      triggerHaptic(8);
    },
    [activeDirections.up, updateDirectionState, triggerHaptic]
  );

  const handleRightUp = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      updateDirectionState(activeDirections.up, false, activeDirections.left, false);
    },
    [activeDirections, updateDirectionState]
  );

  const handleJumpDown = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      updateDirectionState(true, false, activeDirections.left, activeDirections.right);
      triggerHaptic(10);
    },
    [activeDirections, updateDirectionState, triggerHaptic]
  );

  const handleJumpUp = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      updateDirectionState(false, false, activeDirections.left, activeDirections.right);
    },
    [activeDirections, updateDirectionState]
  );

  // ── DASH ──
  const handleDashDown = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      setActiveActions(prev => ({ ...prev, dash: true }));
      TouchInputBridge.triggerDash();
      triggerHaptic(12);
    },
    [triggerHaptic]
  );
  const handleDashUp = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault();
    setActiveActions(prev => ({ ...prev, dash: false }));
  }, []);

  // ── DEFENSE ──
  const handleBlockDown = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      setActiveActions(prev => ({ ...prev, block: true }));
      TouchInputBridge.setBlock(true);
      triggerHaptic(10);
    },
    [triggerHaptic]
  );
  const handleBlockUp = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault();
    setActiveActions(prev => ({ ...prev, block: false }));
    TouchInputBridge.setBlock(false);
  }, []);

  const handleParryDown = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      setActiveActions(prev => ({ ...prev, parry: true }));
      TouchInputBridge.triggerParry();
      triggerHaptic(16);
    },
    [triggerHaptic]
  );
  const handleParryUp = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault();
    setActiveActions(prev => ({ ...prev, parry: false }));
  }, []);

  // ── ATTACKS ──
  const handleLightDown = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      setActiveActions(prev => ({ ...prev, light: true }));
      TouchInputBridge.triggerLightAttack();
      triggerHaptic(14);
    },
    [triggerHaptic]
  );
  const handleLightUp = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault();
    setActiveActions(prev => ({ ...prev, light: false }));
  }, []);

  const handleHeavyDown = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      setActiveActions(prev => ({ ...prev, heavy: true }));
      TouchInputBridge.triggerHeavyAttack();
      triggerHaptic(18);
    },
    [triggerHaptic]
  );
  const handleHeavyUp = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault();
    setActiveActions(prev => ({ ...prev, heavy: false }));
  }, []);

  // Desktop guard — render nothing on mouse-only devices
  if (!isTouchDevice) return null;

  return (
    <div className={styles.gamepad} role="region" aria-label="Mobile Game Controls">
      {/* ═══════════════════════════════════════════
          LEFT ZONE — Movement & Jump
          ═══════════════════════════════════════════ */}
      <div className={styles.leftZone}>
        {/* JUMP — top centre of left zone */}
        <button
          type="button"
          className={`${styles.jumpBtn} ${activeDirections.up ? styles.active : ''}`}
          onTouchStart={handleJumpDown}
          onTouchEnd={handleJumpUp}
          onTouchCancel={handleJumpUp}
          onPointerDown={handleJumpDown}
          onPointerUp={handleJumpUp}
          onPointerCancel={handleJumpUp}
          aria-label="Jump"
        >
          <span className={styles.btnIcon}>↑</span>
          <span className={styles.btnLabel}>JUMP</span>
        </button>

        {/* LEFT + RIGHT — bottom row */}
        <div className={styles.lrRow}>
          <button
            type="button"
            className={`${styles.moveBtn} ${activeDirections.left ? styles.active : ''}`}
            onTouchStart={handleLeftDown}
            onTouchEnd={handleLeftUp}
            onTouchCancel={handleLeftUp}
            onPointerDown={handleLeftDown}
            onPointerUp={handleLeftUp}
            onPointerCancel={handleLeftUp}
            aria-label="Move Left"
          >
            <span className={styles.btnIcon}>◀</span>
            <span className={styles.btnLabel}>LEFT</span>
          </button>

          {/* DASH — centre between L & R */}
          <button
            type="button"
            className={`${styles.dashBtn} ${activeActions.dash ? styles.active : ''}`}
            onTouchStart={handleDashDown}
            onTouchEnd={handleDashUp}
            onTouchCancel={handleDashUp}
            onPointerDown={handleDashDown}
            onPointerUp={handleDashUp}
            onPointerCancel={handleDashUp}
            aria-label="Dash"
          >
            <span className={styles.btnIcon}>💨</span>
            <span className={styles.btnLabel}>DASH</span>
          </button>

          <button
            type="button"
            className={`${styles.moveBtn} ${activeDirections.right ? styles.active : ''}`}
            onTouchStart={handleRightDown}
            onTouchEnd={handleRightUp}
            onTouchCancel={handleRightUp}
            onPointerDown={handleRightDown}
            onPointerUp={handleRightUp}
            onPointerCancel={handleRightUp}
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
            className={`${styles.defBtn} ${styles.blockBtn} ${activeActions.block ? styles.active : ''}`}
            onTouchStart={handleBlockDown}
            onTouchEnd={handleBlockUp}
            onTouchCancel={handleBlockUp}
            onPointerDown={handleBlockDown}
            onPointerUp={handleBlockUp}
            onPointerCancel={handleBlockUp}
            aria-label="Block"
          >
            <span className={styles.btnIcon}>🛡️</span>
            <span className={styles.btnLabel}>BLOCK</span>
          </button>

          <button
            type="button"
            className={`${styles.defBtn} ${styles.parryBtn} ${activeActions.parry ? styles.active : ''}`}
            onTouchStart={handleParryDown}
            onTouchEnd={handleParryUp}
            onTouchCancel={handleParryUp}
            onPointerDown={handleParryDown}
            onPointerUp={handleParryUp}
            onPointerCancel={handleParryUp}
            aria-label="Parry"
          >
            <span className={styles.btnIcon}>✨</span>
            <span className={styles.btnLabel}>PARRY</span>
          </button>
        </div>

        {/* Attack row on bottom */}
        <div className={styles.atkRow}>
          <button
            type="button"
            className={`${styles.atkBtn} ${styles.heavyBtn} ${activeActions.heavy ? styles.active : ''}`}
            onTouchStart={handleHeavyDown}
            onTouchEnd={handleHeavyUp}
            onTouchCancel={handleHeavyUp}
            onPointerDown={handleHeavyDown}
            onPointerUp={handleHeavyUp}
            onPointerCancel={handleHeavyUp}
            aria-label="Heavy Strike"
          >
            <span className={styles.btnIcon}>⚡</span>
            <span className={styles.btnLabel}>HEAVY</span>
          </button>

          <button
            type="button"
            className={`${styles.atkBtn} ${styles.lightBtn} ${activeActions.light ? styles.active : ''}`}
            onTouchStart={handleLightDown}
            onTouchEnd={handleLightUp}
            onTouchCancel={handleLightUp}
            onPointerDown={handleLightDown}
            onPointerUp={handleLightUp}
            onPointerCancel={handleLightUp}
            aria-label="Light Attack"
          >
            <span className={styles.btnIcon}>⚔️</span>
            <span className={styles.btnLabel}>LIGHT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
