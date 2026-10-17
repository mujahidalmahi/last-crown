'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TouchInputBridge } from '../../game/input/TouchInputBridge';
import styles from './MobileGameControls.module.css';

interface MobileGameControlsProps {
  isPortrait?: boolean;
}

export const MobileGameControls: React.FC<MobileGameControlsProps> = ({ isPortrait = false }) => {
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
    thrust: boolean;
    sweep: boolean;
    block: boolean;
    parry: boolean;
    dash: boolean;
  }>({
    light: false,
    heavy: false,
    thrust: false,
    sweep: false,
    block: false,
    parry: false,
    dash: false,
  });

  const dpadRef = useRef<HTMLDivElement>(null);
  const dpadTouchIdRef = useRef<number | null>(null);

  // Device detection: strictly check touch capability & screen dimensions
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
        // Ignore haptic failures gracefully
      }
    }
  }, []);

  // Update directional input bridge
  const updateDirectionState = useCallback(
    (up: boolean, down: boolean, left: boolean, right: boolean) => {
      setActiveDirections({ up, down, left, right });
      TouchInputBridge.setDirection({ up, down, left, right });
    },
    []
  );

  // Directional Button Actions: Left & Right
  const handleLeftDown = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      updateDirectionState(activeDirections.up, activeDirections.down, true, false);
      triggerHaptic(8);
    },
    [activeDirections, updateDirectionState, triggerHaptic]
  );

  const handleLeftUp = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      updateDirectionState(
        activeDirections.up,
        activeDirections.down,
        false,
        activeDirections.right
      );
    },
    [activeDirections, updateDirectionState]
  );

  const handleRightDown = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      updateDirectionState(activeDirections.up, activeDirections.down, false, true);
      triggerHaptic(8);
    },
    [activeDirections, updateDirectionState, triggerHaptic]
  );

  const handleRightUp = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      updateDirectionState(
        activeDirections.up,
        activeDirections.down,
        activeDirections.left,
        false
      );
    },
    [activeDirections, updateDirectionState]
  );

  const handleJumpDown = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      updateDirectionState(true, false, activeDirections.left, activeDirections.right);
      triggerHaptic(8);
    },
    [activeDirections, updateDirectionState, triggerHaptic]
  );

  const handleJumpUp = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      updateDirectionState(
        false,
        activeDirections.down,
        activeDirections.left,
        activeDirections.right
      );
    },
    [activeDirections, updateDirectionState]
  );

  const handleCrouchDown = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      updateDirectionState(
        activeDirections.up,
        true,
        activeDirections.left,
        activeDirections.right
      );
      triggerHaptic(8);
    },
    [activeDirections, updateDirectionState, triggerHaptic]
  );

  const handleCrouchUp = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      updateDirectionState(
        activeDirections.up,
        false,
        activeDirections.left,
        activeDirections.right
      );
    },
    [activeDirections, updateDirectionState]
  );

  // D-Pad Touch/Pointer coordinate resolver for smooth 360 thumb gliding
  const handleDpadPointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!dpadRef.current) return;
      const rect = dpadRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const deadzone = rect.width * 0.12;

      const left = dx < -deadzone;
      const right = dx > deadzone;
      const up = dy < -deadzone;
      const down = dy > deadzone;

      updateDirectionState(up, down, left, right);
    },
    [updateDirectionState]
  );

  const onDpadTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const touch = e.touches[e.touches.length - 1];
    if (touch) {
      dpadTouchIdRef.current = touch.identifier;
      handleDpadPointer(touch.clientX, touch.clientY);
      triggerHaptic(8);
    }
  };

  const onDpadTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (dpadTouchIdRef.current === null) return;
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      if (touch && touch.identifier === dpadTouchIdRef.current) {
        handleDpadPointer(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const onDpadTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    let stillActive = false;
    if (dpadTouchIdRef.current !== null) {
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        if (touch && touch.identifier === dpadTouchIdRef.current) {
          stillActive = true;
          break;
        }
      }
    }
    if (!stillActive) {
      dpadTouchIdRef.current = null;
      updateDirectionState(false, false, false, false);
    }
  };

  // Evasion: Dash
  const handleDashDown = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setActiveActions(prev => ({ ...prev, dash: true }));
    TouchInputBridge.triggerDash();
    triggerHaptic(12);
  };
  const handleDashUp = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setActiveActions(prev => ({ ...prev, dash: false }));
  };

  // Defensive Actions: Block, Parry
  const handleBlockDown = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setActiveActions(prev => ({ ...prev, block: true }));
    TouchInputBridge.setBlock(true);
    triggerHaptic(10);
  };
  const handleBlockUp = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setActiveActions(prev => ({ ...prev, block: false }));
    TouchInputBridge.setBlock(false);
  };

  const handleParryDown = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setActiveActions(prev => ({ ...prev, parry: true }));
    TouchInputBridge.triggerParry();
    triggerHaptic(16);
  };
  const handleParryUp = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setActiveActions(prev => ({ ...prev, parry: false }));
  };

  // Attacking Moves: Light, Heavy, Thrust, Sweep
  const handleLightAttackDown = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setActiveActions(prev => ({ ...prev, light: true }));
    TouchInputBridge.triggerLightAttack();
    triggerHaptic(14);
  };
  const handleLightAttackUp = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setActiveActions(prev => ({ ...prev, light: false }));
  };

  const handleHeavyAttackDown = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setActiveActions(prev => ({ ...prev, heavy: true }));
    TouchInputBridge.triggerHeavyAttack();
    triggerHaptic(18);
  };
  const handleHeavyAttackUp = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setActiveActions(prev => ({ ...prev, heavy: false }));
  };

  const handleThrustDown = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setActiveActions(prev => ({ ...prev, thrust: true }));
    TouchInputBridge.triggerThrust();
    triggerHaptic(14);
  };
  const handleThrustUp = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setActiveActions(prev => ({ ...prev, thrust: false }));
  };

  const handleSweepDown = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setActiveActions(prev => ({ ...prev, sweep: true }));
    TouchInputBridge.triggerSweep();
    triggerHaptic(15);
  };
  const handleSweepUp = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setActiveActions(prev => ({ ...prev, sweep: false }));
  };

  // On desktop fine-pointer screens: Return null to guarantee 0 changes to desktop layout or DOM!
  if (!isTouchDevice) {
    return null;
  }

  return (
    <div
      className={`${styles.mobileControlsContainer} ${isPortrait ? styles.portraitMode : styles.landscapeMode}`}
      role="region"
      aria-label="Mobile Game Touch Controls"
    >
      {/* =========================================================================
          LEFT THUMB ZONE: Movement Deck (Left, Right, D-Pad, Jump, Crouch, Dash)
          ========================================================================= */}
      <div className={styles.leftThumbZone}>
        {/* Tactical Dash & Header */}
        <div className={styles.leftTopBar}>
          <button
            type="button"
            className={`${styles.dashBtn} ${activeActions.dash ? styles.active : ''}`}
            onTouchStart={handleDashDown}
            onTouchEnd={handleDashUp}
            onTouchCancel={handleDashUp}
            onPointerDown={handleDashDown}
            onPointerUp={handleDashUp}
            onPointerCancel={handleDashUp}
            aria-label="Tactical Dash"
            title="Evasive Dash [C / E]"
          >
            <span className={styles.dashIcon}>💨</span>
            <span className={styles.dashLabel}>DASH</span>
          </button>

          <span className={styles.zoneTag}>MOVE</span>
        </div>

        {/* Tactical Cross D-Pad */}
        <div
          ref={dpadRef}
          className={styles.dpadContainer}
          onTouchStart={onDpadTouchStart}
          onTouchMove={onDpadTouchMove}
          onTouchEnd={onDpadTouchEnd}
          onTouchCancel={onDpadTouchEnd}
          role="group"
          aria-label="Directional Movement Pad"
        >
          <div className={styles.dpadCrossBackdrop} />

          {/* Up / Jump */}
          <button
            type="button"
            className={`${styles.dpadDir} ${styles.dpadUp} ${activeDirections.up ? styles.active : ''}`}
            onTouchStart={handleJumpDown}
            onTouchEnd={handleJumpUp}
            onTouchCancel={handleJumpUp}
            onPointerDown={handleJumpDown}
            onPointerUp={handleJumpUp}
            onPointerCancel={handleJumpUp}
            aria-label="Jump / Up"
          >
            <span className={styles.dirArrow}>▲</span>
          </button>

          {/* Left */}
          <button
            type="button"
            className={`${styles.dpadDir} ${styles.dpadLeft} ${activeDirections.left ? styles.active : ''}`}
            onTouchStart={handleLeftDown}
            onTouchEnd={handleLeftUp}
            onTouchCancel={handleLeftUp}
            onPointerDown={handleLeftDown}
            onPointerUp={handleLeftUp}
            onPointerCancel={handleLeftUp}
            aria-label="Move Left"
          >
            <span className={styles.dirArrow}>◀</span>
          </button>

          {/* Center Crown Emblem */}
          <div className={styles.dpadCenter} aria-hidden="true">
            👑
          </div>

          {/* Right */}
          <button
            type="button"
            className={`${styles.dpadDir} ${styles.dpadRight} ${activeDirections.right ? styles.active : ''}`}
            onTouchStart={handleRightDown}
            onTouchEnd={handleRightUp}
            onTouchCancel={handleRightUp}
            onPointerDown={handleRightDown}
            onPointerUp={handleRightUp}
            onPointerCancel={handleRightUp}
            aria-label="Move Right"
          >
            <span className={styles.dirArrow}>▶</span>
          </button>

          {/* Down / Crouch */}
          <button
            type="button"
            className={`${styles.dpadDir} ${styles.dpadDown} ${activeDirections.down ? styles.active : ''}`}
            onTouchStart={handleCrouchDown}
            onTouchEnd={handleCrouchUp}
            onTouchCancel={handleCrouchUp}
            onPointerDown={handleCrouchDown}
            onPointerUp={handleCrouchUp}
            onPointerCancel={handleCrouchUp}
            aria-label="Crouch / Down"
          >
            <span className={styles.dirArrow}>▼</span>
          </button>
        </div>

        {/* Dedicated LEFT & RIGHT Step Buttons */}
        <div className={styles.horizontalMoveBar} role="group" aria-label="Horizontal Movement">
          <button
            type="button"
            className={`${styles.stepBtn} ${activeDirections.left ? styles.active : ''}`}
            onTouchStart={handleLeftDown}
            onTouchEnd={handleLeftUp}
            onTouchCancel={handleLeftUp}
            onPointerDown={handleLeftDown}
            onPointerUp={handleLeftUp}
            onPointerCancel={handleLeftUp}
            aria-label="Step Left"
            title="Move Left [A / ◀]"
          >
            <span>◀ LEFT</span>
          </button>

          <button
            type="button"
            className={`${styles.stepBtn} ${activeDirections.right ? styles.active : ''}`}
            onTouchStart={handleRightDown}
            onTouchEnd={handleRightUp}
            onTouchCancel={handleRightUp}
            onPointerDown={handleRightDown}
            onPointerUp={handleRightUp}
            onPointerCancel={handleRightUp}
            aria-label="Step Right"
            title="Move Right [D / ▶]"
          >
            <span>RIGHT ▶</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          RIGHT THUMB ZONE: Combat Deck (Defense on top, Attack diamond below)
          ========================================================================= */}
      <div className={styles.rightThumbZone}>
        {/* Upper Tier: Defensive Modes (Block & Parry) */}
        <div className={styles.defenseBar} role="group" aria-label="Defensive Modes">
          <span className={styles.zoneTag}>DEFENSE</span>

          <div className={styles.defenseBtnGroup}>
            {/* Block / Guard (Holdable Shield) */}
            <button
              type="button"
              className={`${styles.defenseBtn} ${styles.btnBlock} ${activeActions.block ? styles.active : ''}`}
              onTouchStart={handleBlockDown}
              onTouchEnd={handleBlockUp}
              onTouchCancel={handleBlockUp}
              onPointerDown={handleBlockDown}
              onPointerUp={handleBlockUp}
              onPointerCancel={handleBlockUp}
              aria-label="Hold Guard / Block"
              title="Hold to Block [Shift / I]"
            >
              <span className={styles.defIcon}>🛡️</span>
              <span className={styles.defLabel}>BLOCK</span>
            </button>

            {/* Parry & Riposte (Counter) */}
            <button
              type="button"
              className={`${styles.defenseBtn} ${styles.btnParry} ${activeActions.parry ? styles.active : ''}`}
              onTouchStart={handleParryDown}
              onTouchEnd={handleParryUp}
              onTouchCancel={handleParryUp}
              onPointerDown={handleParryDown}
              onPointerUp={handleParryUp}
              onPointerCancel={handleParryUp}
              aria-label="Parry & Riposte"
              title="Parry Deflection [Alt / O]"
            >
              <span className={styles.defIcon}>✨</span>
              <span className={styles.defLabel}>PARRY</span>
            </button>
          </div>
        </div>

        {/* Lower Tier: Attacking Moves (Heavy, Thrust, Sweep, Light) */}
        <div className={styles.attackCluster} role="group" aria-label="Attacking Moves">
          {/* 1. Heavy Strike (Top) */}
          <button
            type="button"
            className={`${styles.atkBtn} ${styles.btnHeavy} ${activeActions.heavy ? styles.active : ''}`}
            onTouchStart={handleHeavyAttackDown}
            onTouchEnd={handleHeavyAttackUp}
            onTouchCancel={handleHeavyAttackUp}
            onPointerDown={handleHeavyAttackDown}
            onPointerUp={handleHeavyAttackUp}
            onPointerCancel={handleHeavyAttackUp}
            aria-label="Heavy Strike"
            title="Heavy Strike [K]"
          >
            <span className={styles.atkIcon}>⚡</span>
            <span className={styles.atkLabel}>HEAVY</span>
          </button>

          {/* 2. Forward Thrust (Right) */}
          <button
            type="button"
            className={`${styles.atkBtn} ${styles.btnThrust} ${activeActions.thrust ? styles.active : ''}`}
            onTouchStart={handleThrustDown}
            onTouchEnd={handleThrustUp}
            onTouchCancel={handleThrustUp}
            onPointerDown={handleThrustDown}
            onPointerUp={handleThrustUp}
            onPointerCancel={handleThrustUp}
            aria-label="Forward Thrust"
            title="Thrust [L / U]"
          >
            <span className={styles.atkIcon}>🗡️</span>
            <span className={styles.atkLabel}>THRUST</span>
          </button>

          {/* 3. Low Sweep (Left) */}
          <button
            type="button"
            className={`${styles.atkBtn} ${styles.btnSweep} ${activeActions.sweep ? styles.active : ''}`}
            onTouchStart={handleSweepDown}
            onTouchEnd={handleSweepUp}
            onTouchCancel={handleSweepUp}
            onPointerDown={handleSweepDown}
            onPointerUp={handleSweepUp}
            onPointerCancel={handleSweepUp}
            aria-label="Low Sweep Trip"
            title="Low Sweep [Down + Attack]"
          >
            <span className={styles.atkIcon}>💥</span>
            <span className={styles.atkLabel}>SWEEP</span>
          </button>

          {/* 4. Light Slash (Center/Bottom - Largest Primary) */}
          <button
            type="button"
            className={`${styles.atkBtn} ${styles.btnLight} ${activeActions.light ? styles.active : ''}`}
            onTouchStart={handleLightAttackDown}
            onTouchEnd={handleLightAttackUp}
            onTouchCancel={handleLightAttackUp}
            onPointerDown={handleLightAttackDown}
            onPointerUp={handleLightAttackUp}
            onPointerCancel={handleLightAttackUp}
            aria-label="Light Slash Combo"
            title="Light Slash [J / Space]"
          >
            <span className={styles.atkIcon}>⚔️</span>
            <span className={styles.atkLabel}>LIGHT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
