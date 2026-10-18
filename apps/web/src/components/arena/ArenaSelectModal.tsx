'use client';

import React, { useEffect, useCallback } from 'react';
import styles from './ArenaSelectModal.module.css';

// Crisp pixel-art SVGs faithfully reproducing the reference design icons
const ColosseumIcon = () => (
  <svg
    width="28"
    height="19"
    viewBox="0 0 28 19"
    fill="none"
    style={{ imageRendering: 'pixelated', verticalAlign: 'middle', flexShrink: 0 }}
    aria-hidden="true"
  >
    <rect
      x="2"
      y="5"
      width="24"
      height="13"
      rx="2"
      fill="#c4a482"
      stroke="#6e4726"
      strokeWidth="1.5"
    />
    <path d="M4 5 C4 1, 24 1, 24 5" fill="#b08b62" stroke="#6e4726" strokeWidth="1.5" />
    <ellipse cx="14" cy="5" rx="8" ry="2.5" fill="#5c3818" />
    {/* Arches */}
    <rect x="5" y="8" width="2.5" height="4" rx="1" fill="#361f0a" />
    <rect x="9.5" y="8" width="2.5" height="4" rx="1" fill="#361f0a" />
    <rect x="14" y="8" width="2.5" height="4" rx="1" fill="#361f0a" />
    <rect x="18.5" y="8" width="2.5" height="4" rx="1" fill="#361f0a" />
    <rect x="5" y="13" width="2.5" height="3.5" rx="0.5" fill="#361f0a" />
    <rect x="9.5" y="13" width="2.5" height="3.5" rx="0.5" fill="#361f0a" />
    <rect x="14" y="13" width="2.5" height="3.5" rx="0.5" fill="#361f0a" />
    <rect x="18.5" y="13" width="2.5" height="3.5" rx="0.5" fill="#361f0a" />
  </svg>
);

const DragonIcon = () => (
  <svg
    width="28"
    height="22"
    viewBox="0 0 28 22"
    fill="none"
    style={{ imageRendering: 'pixelated', verticalAlign: 'middle', flexShrink: 0 }}
    aria-hidden="true"
  >
    {/* Head & Horns */}
    <path d="M16 2 L23 4 L25 8 L21 10 L16 8 Z" fill="#b91c1c" stroke="#450a0a" strokeWidth="1" />
    <circle cx="21" cy="5" r="1.2" fill="#fbbf24" />
    {/* Body */}
    <path d="M11 6 L18 9 L15 17 L8 14 Z" fill="#dc2626" stroke="#450a0a" strokeWidth="1" />
    {/* Wings */}
    <path
      d="M13 6 C9 1, 4 3, 3 8 C6 8, 8 11, 11 12 Z"
      fill="#991b1b"
      stroke="#450a0a"
      strokeWidth="1"
    />
    {/* Tail & Claws */}
    <path d="M8 15 Q4 18 2 16 Q3 20 6 18 Z" fill="#b91c1c" stroke="#450a0a" strokeWidth="1" />
    <rect x="12" y="16" width="2.5" height="4" rx="1" fill="#f59e0b" />
    <rect x="8" y="16" width="2.5" height="4" rx="1" fill="#f59e0b" />
  </svg>
);

const StormIcon = () => (
  <svg
    width="28"
    height="22"
    viewBox="0 0 28 22"
    fill="none"
    style={{ imageRendering: 'pixelated', verticalAlign: 'middle', flexShrink: 0 }}
    aria-hidden="true"
  >
    {/* Thunder Cloud */}
    <path
      d="M6 12 C3.5 12 2 10 3 7.5 C4 5 7 5 8.5 6 C9.5 3.5 14 3 17 5 C19.5 4 23 6 22.5 8.5 C24.5 9.5 24 13 21 13 Z"
      fill="#475569"
      stroke="#1e293b"
      strokeWidth="1.5"
    />
    {/* Dual Lightning Bolts */}
    <polygon
      points="10,12 7,17 10,17 9,21 14,15 11,15"
      fill="#facc15"
      stroke="#ca8a04"
      strokeWidth="0.8"
    />
    <polygon
      points="17,12 14,16 17,16 16,20 20,14 18,14"
      fill="#fbbf24"
      stroke="#ca8a04"
      strokeWidth="0.8"
    />
  </svg>
);

const SeaWaveIcon = () => (
  <svg
    width="28"
    height="19"
    viewBox="0 0 28 19"
    fill="none"
    style={{ imageRendering: 'pixelated', verticalAlign: 'middle', flexShrink: 0 }}
    aria-hidden="true"
  >
    {/* Base Ocean Wave */}
    <path
      d="M2 17 C6 17, 7 13, 11 13 C15 13, 16 17, 20 17 C23 17, 24 14, 26 14 L26 18 L2 18 Z"
      fill="#0284c7"
    />
    {/* Curling Crest Wave */}
    <path
      d="M3 13 C7 13, 8 7, 13 7 C17 7, 18 12, 22 12 C24.5 12, 25 10, 26 10 C25 15, 20 16, 17 15 C13 14, 11 10, 8 10 C5 10, 4 13, 3 13 Z"
      fill="#38bdf8"
    />
    {/* Foam Spray */}
    <circle cx="13" cy="6" r="1.5" fill="#f8fafc" />
    <circle cx="15.5" cy="7" r="1.2" fill="#f8fafc" />
    <circle cx="11" cy="7.5" r="1" fill="#f8fafc" />
    <circle cx="23" cy="9.5" r="1.2" fill="#f8fafc" />
  </svg>
);

export interface ArenaItem {
  id: string;
  name: string;
  displayName: string;
  bgImage: string;
  icon: React.ReactNode;
  iconPosition: 'left' | 'right';
  themeColor: string;
}

export const ARENA_LIST: ArenaItem[] = [
  {
    id: 'coloseum',
    name: 'Coloseum',
    displayName: 'Coloseum',
    bgImage: '/assets/backgrounds/playground.jpg',
    icon: <ColosseumIcon />,
    iconPosition: 'left',
    themeColor: '#f1c40f',
  },
  {
    id: 'dragonland',
    name: 'DragonLand',
    displayName: 'DragonLand',
    bgImage: '/assets/backgrounds/playground2.jpg',
    icon: <DragonIcon />,
    iconPosition: 'right',
    themeColor: '#e74c3c',
  },
  {
    id: 'stormforce',
    name: 'StormForce',
    displayName: 'StormForce',
    bgImage: '/assets/backgrounds/playground3.jpg',
    icon: <StormIcon />,
    iconPosition: 'right',
    themeColor: '#38bdf8',
  },
  {
    id: 'seaside',
    name: 'seaSide',
    displayName: 'seaSide',
    bgImage: '/assets/backgrounds/playground4.jpg',
    icon: <SeaWaveIcon />,
    iconPosition: 'left',
    themeColor: '#2dd4bf',
  },
];

export interface ArenaSelectModalProps {
  isOpen: boolean;
  onSelect: (arenaId: string) => void;
  onClose: () => void;
  title?: string;
}

export const ArenaSelectModal: React.FC<ArenaSelectModalProps> = ({
  isOpen,
  onSelect,
  onClose,
  title = 'SELECT ARENA',
}) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [onClose]
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
      aria-label="Select Arena"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modalContainer}>
        {/* Top Navigation Bar: Matching Settings & Room */}
        <nav className={styles.topNav} aria-label="Arena selection navigation">
          <button
            type="button"
            className={styles.mainHallBtn}
            onClick={onClose}
            title="Return to Menu"
          >
            <span>←</span> BACK
          </button>
          <div className={styles.navBadge}>ARENA SELECTION (STEP 1/2)</div>
        </nav>

        {/* Central Pixel-Art Stone Card Frame matching Settings */}
        <div className={styles.stageWrapper}>
          <div className={styles.stoneCard}>
            {/* Top Embossed Plaque Title */}
            <h2 className={styles.plaqueTitle}>{title || 'ARENA SELECTION'}</h2>

            {/* Inner Canvas Compartment */}
            <div className={styles.innerCanvas}>
              {/* Subtle CRT Scanline Overlay */}
              <div className={styles.scanlineOverlay} aria-hidden="true" />

              {/* 2x2 Arena Compartment Cards Grid */}
              <div className={styles.arenaGrid}>
                {ARENA_LIST.map(arena => (
                  <div key={arena.id} className={styles.arenaSlot}>
                    {/* Compartment Header */}
                    <div className={styles.badgeHeader}>
                      {arena.iconPosition === 'left' && (
                        <span className={styles.badgeIcon}>{arena.icon}</span>
                      )}
                      <span className={styles.badgeName}>{arena.displayName}</span>
                      {arena.iconPosition === 'right' && (
                        <span className={styles.badgeIcon}>{arena.icon}</span>
                      )}
                    </div>

                    {/* Stone Frame Button with Live Playground Preview */}
                    <button
                      type="button"
                      className={styles.stoneButton}
                      onClick={() => onSelect(arena.id)}
                      aria-label={`Select ${arena.displayName} Arena`}
                      title={`Play in ${arena.displayName}`}
                    >
                      <div
                        className={styles.buttonBgImage}
                        style={{ backgroundImage: `url('${arena.bgImage}')` }}
                      />
                      <div className={styles.buttonInnerFrame} />

                      <span className={styles.buttonActionTag}>
                        <span className={styles.selectBtnText}>CHOOSE ARENA</span>
                      </span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Bottom Bar: Back Button */}
              <div className={styles.bottomNav}>
                <button
                  type="button"
                  className={styles.backBtn}
                  onClick={onClose}
                  title="Return to menu"
                >
                  ← BACK TO MENU
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
