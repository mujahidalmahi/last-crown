'use client';

import React, { useEffect, useCallback } from 'react';
import styles from './WarriorSelectModal.module.css';

export interface WarriorOption {
  preset: string;
  name: string;
  title: string;
  icon: string;
  lore: string;
  health: number;
  stamina: number;
  speed: number;
  weight: number;
  healthPercent: number;
  staminaPercent: number;
  speedPercent: number;
  archetypeStyle: string;
}

export const WARRIOR_OPTIONS: WarriorOption[] = [
  {
    preset: 'knight',
    name: 'Sir Cedric',
    title: 'Crown Knight',
    icon: '🛡️',
    lore: 'Disciplined swordsman of the high royal guard. Steady pacing, reliable heater shield, and balanced defense.',
    health: 100,
    stamina: 100,
    speed: 300,
    weight: 1.0,
    healthPercent: 80,
    staminaPercent: 90,
    speedPercent: 75,
    archetypeStyle: 'Balanced',
  },
  {
    preset: 'duelist',
    name: 'Aurelia',
    title: 'Exiled Windblade',
    icon: '🗡️',
    lore: 'Swift fencing assassin with a slender rapier. Blinding mobility and rapid stamina regen, but lower health.',
    health: 85,
    stamina: 110,
    speed: 360,
    weight: 0.85,
    healthPercent: 68,
    staminaPercent: 100,
    speedPercent: 100,
    archetypeStyle: 'Speed / Finesse',
  },
  {
    preset: 'vanguard',
    name: 'Valerius',
    title: 'Northern Jarl',
    icon: '🔨',
    lore: 'Mountain warlord wielding a crushing war-hammer. Devastating overhead stagger, high health, and immovable poise.',
    health: 125,
    stamina: 90,
    speed: 250,
    weight: 1.3,
    healthPercent: 100,
    staminaPercent: 80,
    speedPercent: 60,
    archetypeStyle: 'Heavy Tank',
  },
  {
    preset: 'marauder',
    name: 'Grimwood',
    title: 'Iron Marauder',
    icon: '🪓',
    lore: 'Brutal gladiator berserker wielding a notched blood cleaver. Relentless offensive momentum and crushing sweeps.',
    health: 110,
    stamina: 95,
    speed: 285,
    weight: 1.15,
    healthPercent: 88,
    staminaPercent: 85,
    speedPercent: 70,
    archetypeStyle: 'Brawler',
  },
];

export interface WarriorSelectModalProps {
  isOpen: boolean;
  selectedPreset?: string;
  selectedArenaName?: string;
  onSelectWarrior: (preset: string) => void;
  onBackToArena: () => void;
  onClose: () => void;
}

export const WarriorSelectModal: React.FC<WarriorSelectModalProps> = ({
  isOpen,
  selectedPreset = 'knight',
  selectedArenaName = 'Bastion Courtyard',
  onSelectWarrior,
  onBackToArena,
  onClose,
}) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onBackToArena();
      } else if (e.key === '1') {
        onSelectWarrior('knight');
      } else if (e.key === '2') {
        onSelectWarrior('duelist');
      } else if (e.key === '3') {
        onSelectWarrior('vanguard');
      } else if (e.key === '4') {
        onSelectWarrior('marauder');
      }
    },
    [isOpen, onBackToArena, onSelectWarrior]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Select Your Champion"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modalContainer}>
        {/* Top Navigation */}
        <header className={styles.topNav}>
          <div className={styles.navLeft}>
            <span className={styles.navIcon} aria-hidden="true">
              👑
            </span>
            <div className={styles.navTitleGroup}>
              <h2 className={styles.navTitle}>SELECT YOUR CHAMPION</h2>
              <span className={styles.navSubtitle}>
                STEP 2 OF 3 • ARENA: {selectedArenaName.toUpperCase()}
              </span>
            </div>
          </div>
          <div className={styles.navActions}>
            <button
              type="button"
              className={styles.navBackButton}
              onClick={onBackToArena}
              title="Return to arena selection (Esc)"
            >
              ◀ BACK TO ARENA
            </button>
          </div>
        </header>

        {/* 4 Warrior Cards Grid */}
        <div className={styles.gridStage} role="radiogroup" aria-label="Warrior Archetypes">
          {WARRIOR_OPTIONS.map((warrior, idx) => {
            const isSelected = selectedPreset === warrior.preset;
            return (
              <div
                key={warrior.preset}
                className={`${styles.warriorCard} ${isSelected ? styles.selected : ''}`}
                tabIndex={0}
                role="radio"
                aria-checked={isSelected}
                aria-label={`${warrior.name}, ${warrior.title}. Archetype: ${warrior.archetypeStyle}`}
                onClick={() => onSelectWarrior(warrior.preset)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectWarrior(warrior.preset);
                  }
                }}
              >
                <div>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardIcon} aria-hidden="true">
                      {warrior.icon}
                    </span>
                    <div className={styles.cardNameGroup}>
                      <span className={styles.cardName}>
                        [{idx + 1}] {warrior.name}
                      </span>
                      <span className={styles.cardTitle}>{warrior.title}</span>
                    </div>
                  </div>

                  <p className={styles.cardLore}>{warrior.lore}</p>
                </div>

                <div>
                  <div className={styles.statsSection}>
                    <div className={styles.statRow}>
                      <span>HEALTH</span>
                      <div className={styles.statBarTrack}>
                        <div
                          className={styles.statBarFill}
                          style={{ width: `${warrior.healthPercent}%`, backgroundColor: '#2ecc71' }}
                        />
                      </div>
                    </div>
                    <div className={styles.statRow}>
                      <span>STAMINA</span>
                      <div className={styles.statBarTrack}>
                        <div
                          className={styles.statBarFill}
                          style={{ width: `${warrior.staminaPercent}%`, backgroundColor: '#00cec9' }}
                        />
                      </div>
                    </div>
                    <div className={styles.statRow}>
                      <span>SPEED</span>
                      <div className={styles.statBarTrack}>
                        <div
                          className={styles.statBarFill}
                          style={{ width: `${warrior.speedPercent}%`, backgroundColor: '#f1c40f' }}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={styles.selectButton}
                    onClick={e => {
                      e.stopPropagation();
                      onSelectWarrior(warrior.preset);
                    }}
                  >
                    SELECT CHAMPION
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
