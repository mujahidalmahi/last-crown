'use client';

import React, { useEffect, useCallback } from 'react';
import styles from './BotSelectModal.module.css';

export interface BotCharacter {
  id: string;
  name: string;
  title: string;
  preset: string; // 'knight' | 'marauder' | 'vanguard' | 'duelist'
  difficulty: 'novice' | 'adept' | 'expert' | 'master';
  difficultyLabel: string;
  difficultyColor: string;
  stars: string;
  icon: string;
  lore: string;
  combatTraits: string[];
}

export const BOT_CHARACTERS: BotCharacter[] = [
  {
    id: 'sir_cedric',
    name: 'Sir Cedric',
    title: 'The Crown Knight',
    preset: 'knight',
    difficulty: 'novice',
    difficultyLabel: 'NOVICE (TIER I)',
    difficultyColor: '#4ade80',
    stars: '★☆☆☆',
    icon: '🛡️',
    lore: 'Disciplined swordsman of the high royal guard. Steady pacing, reliable shield block, and predictable strikes.',
    combatTraits: ['Solid Guard', 'Standard Reach', 'Measured Tempo'],
  },
  {
    id: 'grimwood',
    name: 'Grimwood',
    title: 'The Iron Marauder',
    preset: 'marauder',
    difficulty: 'adept',
    difficultyLabel: 'ADEPT (TIER II)',
    difficultyColor: '#facc15',
    stars: '★★☆☆',
    icon: '🪓',
    lore: 'Fierce gladiator brawler fueled by fury. Relentless forward lunges, high poise, and bone-shattering heavy cleaves.',
    combatTraits: ['Heavy Impact', 'Aggressive Lunges', 'Wall Bounces'],
  },
  {
    id: 'valerius',
    name: 'Valerius',
    title: 'The Northern Jarl',
    preset: 'vanguard',
    difficulty: 'expert',
    difficultyLabel: 'EXPERT (TIER III)',
    difficultyColor: '#fb923c',
    stars: '★★★☆',
    icon: '🔨',
    lore: 'Mountain warlord wielding brutal overhead strikes. High posture resilience, crushing helm splitters, and feints.',
    combatTraits: ['Devastating Chops', 'High Posture', 'Feint Cancels'],
  },
  {
    id: 'aurelia',
    name: 'Aurelia',
    title: 'The Exiled Windblade',
    preset: 'duelist',
    difficulty: 'master',
    difficultyLabel: 'MASTER (TIER IV)',
    difficultyColor: '#ef4444',
    stars: '★★★★',
    icon: '🗡️',
    lore: 'Legendary rogue fencing assassin. Blinding 3-hit combo chains, lethal thrust range, and frame-perfect counter parries.',
    combatTraits: ['Instant Parries', 'Lethal Thrusts', 'Frame Cancels'],
  },
];

const ARENA_DISPLAY_NAMES: Record<string, string> = {
  coloseum: 'Bastion Courtyard',
  dragonland: 'DragonLand Caldera',
  stormforce: 'StormForce Ramparts',
  seaside: 'SeaSide Pirate Haven',
};

export interface BotSelectModalProps {
  isOpen: boolean;
  selectedArenaId?: string;
  onSelect: (bot: BotCharacter) => void;
  onBackToArena: () => void;
  onClose: () => void;
}

export const BotSelectModal: React.FC<BotSelectModalProps> = ({
  isOpen,
  selectedArenaId = 'coloseum',
  onSelect,
  onBackToArena,
  onClose,
}) => {
  const arenaDisplayName = ARENA_DISPLAY_NAMES[selectedArenaId] || 'Bastion Courtyard';

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onBackToArena();
      }
    },
    [onBackToArena]
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Select Bot Opponent"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modalContainer}>
        {/* Top Navigation Bar: Matching Settings, Room & Arena Menubars */}
        <nav className={styles.topNav} aria-label="Bot selection navigation">
          <button
            type="button"
            className={styles.mainHallBtn}
            onClick={onBackToArena}
            title="Return to Arena Selection"
          >
            <span>←</span> SCENARIOS
          </button>
          <div className={styles.navBadge}>{arenaDisplayName.toUpperCase()} (STEP 2/2)</div>
        </nav>

        {/* Central Pixel-Art Stone Card Frame matching Settings */}
        <div className={styles.stageWrapper}>
          <div className={styles.stoneCard}>
            {/* Top Embossed Plaque Title */}
            <h2 className={styles.plaqueTitle}>BATTLE AI WARRIOR</h2>

            {/* Inner Canvas Compartment */}
            <div className={styles.innerCanvas}>
              {/* Subtle CRT Scanline Overlay */}
              <div className={styles.scanlineOverlay} aria-hidden="true" />

              {/* 2x2 Bot Compartment Cards Grid */}
              <div className={styles.botGrid}>
                {BOT_CHARACTERS.map(bot => (
                  <div
                    key={bot.id}
                    className={styles.botSlot}
                    onClick={() => onSelect(bot)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Select bot ${bot.name}, difficulty ${bot.difficultyLabel}`}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelect(bot);
                      }
                    }}
                  >
                    {/* Compartment Header */}
                    <div className={styles.slotHeader}>
                      <div className={styles.botIdentity}>
                        <span className={styles.botIcon}>{bot.icon}</span>
                        <span className={styles.botName}>{bot.name}</span>
                      </div>
                      <span
                        className={styles.difficultyBadge}
                        style={{
                          color: bot.difficultyColor,
                          border: `1.5px solid ${bot.difficultyColor}`,
                          backgroundColor: 'rgba(5, 8, 16, 0.85)',
                        }}
                      >
                        <span>{bot.difficultyLabel}</span>
                        <span style={{ fontSize: '0.85em' }}>{bot.stars}</span>
                      </span>
                    </div>

                    <div className={styles.botTitle}>{bot.title}</div>
                    <p className={styles.botLore}>{bot.lore}</p>

                    {/* Trait Pills */}
                    <div className={styles.traitsRow}>
                      {bot.combatTraits.map((trait, idx) => (
                        <span key={idx} className={styles.traitTag}>
                          {trait}
                        </span>
                      ))}
                    </div>

                    {/* 3D Gold Action Tag Button */}
                    <button
                      type="button"
                      className={styles.chooseBotBtn}
                      onClick={e => {
                        e.stopPropagation();
                        onSelect(bot);
                      }}
                      aria-label={`Fight against ${bot.name}`}
                    >
                      <span>⚔️</span>
                      <span>CHOOSE BOT</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Bottom Navigation Bar */}
              <div className={styles.bottomNav}>
                <button
                  type="button"
                  className={styles.backBtn}
                  onClick={onBackToArena}
                  title="Return to Arena Selection"
                >
                  ← BACK TO SCENARIOS
                </button>
                <button
                  type="button"
                  className={styles.backBtn}
                  onClick={onClose}
                  title="Cancel and return to menu"
                >
                  ✕ CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
