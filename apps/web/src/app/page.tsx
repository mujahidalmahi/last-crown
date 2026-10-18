'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Footer } from '../components/layout/Footer';
import styles from './page.module.css';

interface GalleryItem {
  id: string;
  name: string;
  image: string;
  tag: string;
  lore: string;
}

const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'coloseum',
    name: 'Bastion Courtyard (Colosseum)',
    image: '/assets/backgrounds/playground.jpg',
    tag: 'Imperial Arena',
    lore: 'The sun-drenched imperial arena where gladiators clash amid ancient stone pillars and the roar of spectators.',
  },
  {
    id: 'dragonland',
    name: 'DragonLand Caldera',
    image: '/assets/backgrounds/playground2.jpg',
    tag: 'Volcanic Crucible',
    lore: 'Treacherous stone bridges suspended over cascading rivers of molten magma under the gaze of the volcanic dragon.',
  },
  {
    id: 'stormforce',
    name: 'StormForce Ramparts',
    image: '/assets/backgrounds/playground3.jpg',
    tag: 'Fortress Battlement',
    lore: 'Gale-swept ramparts battered by downpours and lightning, testing warrior balance and reflex.',
  },
  {
    id: 'seaside',
    name: 'SeaSide Pirate Haven',
    image: '/assets/backgrounds/playground4.jpg',
    tag: 'Coastal Ruins',
    lore: 'Decaying pirate docks and sandbanks where crashing oceanic surges shift the combat footing each round.',
  },
  {
    id: 'keep',
    name: 'The Royal Keep (Throne Room)',
    image: '/assets/backgrounds/cover.jpg',
    tag: 'Sanctum of Sovereignty',
    lore: 'The sacred Gothic throne room where contenders meet their fate and only the supreme victor claims the Last-Crown.',
  },
];

interface GameMode {
  id: string;
  badge: string;
  title: string;
  summary: string;
  features: string[];
  actionLabel: string;
  href: string;
}

const GAME_MODES: GameMode[] = [
  {
    id: 'ai',
    badge: '1 PLAYER',
    title: 'SOLO CRUCIBLE',
    summary:
      'Duel adaptive AI bot champions across 4 arenas. Practice spacing, frame-perfect parries, and combos.',
    features: ['4 Sacred Arenas', 'Adaptive Bot AI', 'Instant Match Restart'],
    actionLabel: 'PLAY VS AI',
    href: '/game',
  },
  {
    id: 'local',
    badge: '2 PLAYERS • SAME SCREEN',
    title: 'COUCH BATTLE',
    summary:
      'Head-to-head combat on a single screen. Scan the on-screen QR code with your phone to use it as a wireless gamepad.',
    features: ['Phone QR Gamepad', 'Zero App Downloads', 'USB & Bluetooth Gamepads'],
    actionLabel: 'LOCAL DUEL',
    href: '/local',
  },
  {
    id: 'online',
    badge: 'MULTIPLAYER • VOICE',
    title: 'ONLINE 1V1 ROOM',
    summary:
      'Private chamber matchmaking with deterministic 60Hz netcode and low-latency WebRTC peer voice chat.',
    features: ['6-Letter Room Codes', 'Built-in Voice Chat', 'Server-Authoritative Netcode'],
    actionLabel: 'JOIN / HOST ROOM',
    href: '/room',
  },
];

interface CombatMove {
  keyBadge: string;
  title: string;
  desc: string;
  tip: string;
}

const COMBAT_MOVES: CombatMove[] = [
  {
    keyBadge: 'TAP / J',
    title: 'LIGHT SLASH & COMBOS',
    desc: 'Rapid forward blade strikes with frame-cancel windows into dash or guard. Chain up to 3 consecutive strikes into a full combo sequence.',
    tip: 'Fast startup • Frame cancelable',
  },
  {
    keyBadge: 'HOLD / K',
    title: 'HEAVY THRUST & WINDUPS',
    desc: 'Extended reach piercing strike delivering heavy damage and severe posture drain. Can be canceled mid-windup to bait opponent defensive reactions.',
    tip: 'High damage • Posture breaker',
  },
  {
    keyBadge: 'TIMED / L',
    title: 'DEFLECTION & PARRY',
    desc: 'Activating block within 180ms of an incoming strike parries the blow completely, staggering the attacker into a vulnerable punish window.',
    tip: '180ms window • Staggers foe',
  },
  {
    keyBadge: 'SYSTEM',
    title: 'STAMINA & POSTURE BREAK',
    desc: 'Guarding absorbs 75% damage at the cost of stamina. Draining the stamina gauge completely inflicts a 450ms guard break stagger.',
    tip: 'Depletes defense • Punishes turtles',
  },
];

interface Developer {
  name: string;
  role: string;
  focus: string;
  avatar: string;
  bio: string;
  github: string;
  portfolio: string;
}

const DEVELOPERS: Developer[] = [
  {
    name: 'Mujahid Al Mahi',
    role: 'Co-Creator',
    focus: 'Core Game Physics, Controls & Netcode',
    avatar: '/assets/developers/mujahid-al-mahi.jpg',
    bio: 'Engineered Last-Crown’s deterministic 60Hz physics core, custom integer collision hitboxes, frame-cancel windows, responsive player controlling mechanics, and server-authoritative Colyseus netcode.',
    github: 'https://github.com/mujahidalmahi',
    portfolio: 'https://mujahidmahi.me',
  },
  {
    name: 'Shahariar Hossain Jibon',
    role: 'Co-Creator',
    focus: 'UI/UX, Responsiveness & Visual Design',
    avatar: '/assets/developers/shahariar-hossain-jibon.jpg',
    bio: 'Crafted the 16-bit visual identity, responsive multi-device layout, retro interface, arena cinematography, and touch controller experience across desktop, mobile, and tablets.',
    github: 'https://github.com/ShahariarJibon',
    portfolio: 'https://portfolio-v2-smoky-phi.vercel.app/',
  },
];

interface DevLogEntry {
  step: string;
  phase: string;
  title: string;
  notes: string;
}

const DEV_LOG: DevLogEntry[] = [
  {
    step: '01',
    phase: 'GENESIS',
    title: 'The Arcade Vision',
    notes:
      'Born from a love of 90s fighting arcade cabinets. The goal: a zero-install, competitive 2D sword fighter running natively in any modern browser with zero compromise on input latency.',
  },
  {
    step: '02',
    phase: 'ENGINE',
    title: 'Deterministic 60Hz Core',
    notes:
      'Built a headless physics engine in TypeScript from scratch. Integer-accurate AABB bounding boxes, deterministic fixed timesteps, and precise frame-data cancel windows.',
  },
  {
    step: '03',
    phase: 'NETCODE',
    title: 'Real-time Multiplayer & Voice',
    notes:
      'Server-authoritative rooms on Colyseus for anti-cheat validation, paired with low-latency WebRTC peer audio so dueling friends can talk in real time.',
  },
  {
    step: '04',
    phase: 'CONTROLLER',
    title: 'Smartphone QR Companion',
    notes:
      'Eliminated the need for extra physical gamepads. Scan the screen QR code with your phone camera to instantly turn your device into a wireless haptic gamepad.',
  },
  {
    step: '05',
    phase: 'RELEASE',
    title: 'Open Source & Polish',
    notes:
      'Hardened with 103+ automated tests, full accessibility skip links, landscape mobile controls, and released 100% free and open-source on GitHub.',
  },
];

export default function HomePage() {
  const [selectedGalleryIndex, setSelectedGalleryIndex] = useState(0);

  const currentGalleryItem: GalleryItem = GALLERY_ITEMS[selectedGalleryIndex] ?? GALLERY_ITEMS[0]!;

  return (
    <div className={styles.landingWrapper}>
      {/* --------------------------------------------------------------------
          Header & Navigation
          -------------------------------------------------------------------- */}
      <header className={styles.navbar}>
        <div className={styles.navContainer}>
          <Link href="/" className={styles.brandLink}>
            <img
              src="/crown-logo.png"
              alt="Last-Crown Emblem"
              width={34}
              height={34}
              className={styles.brandLogo}
            />
            <div className={styles.brandText}>
              <span className={styles.brandTitle}>LAST-CROWN</span>
              <span className={styles.brandSubtitle}>The winner takes it all</span>
            </div>
          </Link>

          <nav aria-label="Main Navigation">
            <ul className={styles.navLinks}>
              <li>
                <a href="#modes" className={styles.navLink}>
                  Modes
                </a>
              </li>
              <li>
                <a href="#screenshots" className={styles.navLink}>
                  Arenas
                </a>
              </li>
              <li>
                <a href="#mechanics" className={styles.navLink}>
                  Combat
                </a>
              </li>
              <li>
                <a href="#developer" className={styles.navLink}>
                  Creators
                </a>
              </li>
              <li>
                <a href="#journey" className={styles.navLink}>
                  Dev Log
                </a>
              </li>
            </ul>
          </nav>

          <div className={styles.navActions}>
            <a
              href="https://github.com/mujahidalmahi/last-crown"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.navGithubBtn}
              title="View Last-Crown source code on GitHub"
              aria-label="View Last-Crown repository on GitHub"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
                className={styles.githubIcon}
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>GITHUB</span>
            </a>

            <Link
              href="/game"
              className={styles.navPlayBtn}
              title="Launch the game at last-crown.top/game"
            >
              <span>PLAY GAME</span>
            </Link>
          </div>
        </div>
      </header>

      {/* --------------------------------------------------------------------
          Hero Section (Arcade Title Screen)
          -------------------------------------------------------------------- */}
      <section className={styles.heroSection} aria-label="Hero Section">
        <div className={styles.heroContent}>
          <div className={styles.heroLogoContainer}>
            <img
              src="/crown-logo.png"
              alt="Last-Crown Gold Crown Emblem"
              width={96}
              height={96}
              style={{ imageRendering: 'pixelated' }}
            />
          </div>

          <h1 className={styles.heroTitle}>LAST-CROWN</h1>
          <h2 className={styles.heroSubtitle}>The winner takes it all</h2>

          <p className={styles.heroDescription}>
            A competitive 2D retro sword fighter running at 60 FPS in your browser. Duel adaptive AI
            bot champions, challenge friends online with built-in voice chat, or scan a QR code to
            turn your phone into a wireless gamepad.
          </p>

          <div className={styles.heroCtaGroup}>
            <Link href="/game" className={styles.heroPrimaryBtn}>
              <span>👑</span>
              <span>PLAY LAST-CROWN</span>
            </Link>
            <a
              href="https://github.com/mujahidalmahi/last-crown"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.heroSecondaryBtn}
            >
              <span>⭐</span>
              <span>GITHUB REPOSITORY</span>
            </a>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          Game Modes Section (#modes)
          -------------------------------------------------------------------- */}
      <section id="modes" className={styles.section} aria-label="Game Modes">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>// GAME MODES</span>
          <h2 className={styles.sectionTitle}>CHOOSE YOUR BATTLE</h2>
          <p className={styles.sectionSubtitle}>
            Three ways to fight. Test your sword against adaptive AI, battle head-to-head on the
            couch, or host an online chamber.
          </p>
        </div>

        <div className={styles.modesGrid}>
          {GAME_MODES.map(mode => (
            <div key={mode.id} className={styles.modeCard}>
              <div>
                <span className={styles.modeBadge}>{mode.badge}</span>
                <h3 className={styles.modeCardTitle}>{mode.title}</h3>
                <p className={styles.modeCardBody}>{mode.summary}</p>

                <ul className={styles.modeFeaturesList}>
                  {mode.features.map(feat => (
                    <li key={feat} className={styles.modeFeatureItem}>
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>

              <Link href={mode.href} className={styles.modeActionBtn}>
                <span>{mode.actionLabel}</span>
                <span>▸</span>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------------------
          Arenas Showcase (#screenshots)
          -------------------------------------------------------------------- */}
      <section id="screenshots" className={styles.section} aria-label="Arenas & Battlegrounds">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>// BATTLEGROUNDS</span>
          <h2 className={styles.sectionTitle}>SACRED ARENAS</h2>
          <p className={styles.sectionSubtitle}>
            Five handcrafted 2D battlegrounds featuring distinct atmosphere, lighting, and terrain
            kinematics.
          </p>
        </div>

        <div className={styles.galleryContainer}>
          {/* Main Stage Viewport */}
          <div className={styles.mainStageWrapper}>
            <img
              src={currentGalleryItem.image}
              alt={currentGalleryItem.name}
              className={styles.mainStageImage}
            />
            <div className={styles.stageInfoOverlay}>
              <div>
                <span className={styles.sectionTag}>{currentGalleryItem.tag}</span>
                <h3 className={styles.stageTitle}>{currentGalleryItem.name}</h3>
                <p className={styles.stageLore}>{currentGalleryItem.lore}</p>
              </div>
              <Link href="/game" className={styles.stagePlayBtn}>
                <span>FIGHT HERE ⚔</span>
              </Link>
            </div>
          </div>

          {/* Interactive Thumbnails */}
          <div className={styles.thumbnailStrip} role="tablist" aria-label="Arena Thumbnails">
            {GALLERY_ITEMS.map((item, idx) => {
              const isActive = idx === selectedGalleryIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`View ${item.name}`}
                  onClick={() => setSelectedGalleryIndex(idx)}
                  className={`${styles.thumbnailBtn} ${isActive ? styles.thumbnailBtnActive : ''}`}
                >
                  <img src={item.image} alt={item.name} className={styles.thumbnailImage} />
                  <span className={styles.thumbnailTag}>{item.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          Combat System & Move List (#mechanics)
          -------------------------------------------------------------------- */}
      <section id="mechanics" className={styles.section} aria-label="Combat Mechanics">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>// COMBAT ENGINE</span>
          <h2 className={styles.sectionTitle}>MARTIAL CONTROLS & MOVES</h2>
          <p className={styles.sectionSubtitle}>
            A deterministic 60Hz fighting system where spacing, feints, and razor-sharp parry timing
            dictate survival.
          </p>
        </div>

        <div className={styles.mechanicsGrid}>
          {COMBAT_MOVES.map(move => (
            <div key={move.title} className={styles.mechanicCard}>
              <span className={styles.moveKeyBadge}>{move.keyBadge}</span>
              <h3 className={styles.mechanicTitle}>{move.title}</h3>
              <p className={styles.mechanicDesc}>{move.desc}</p>
              <div className={styles.moveTip}>{move.tip}</div>
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------------------
          The Creators (#developer)
          -------------------------------------------------------------------- */}
      <section id="developer" className={styles.section} aria-label="The Creators">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>// THE CREATORS</span>
          <h2 className={styles.sectionTitle}>MEET THE DEVELOPERS</h2>
          <p className={styles.sectionSubtitle}>
            Crafted from the ground up by Mujahid Al Mahi and Shahariar Hossain Jibon.
          </p>
        </div>

        <div className={styles.developersGrid}>
          {DEVELOPERS.map(dev => (
            <div key={dev.name} className={styles.devCard}>
              <div className={styles.devAvatarBox} aria-hidden="true">
                <img
                  src={dev.avatar}
                  alt={dev.name}
                  className={styles.devAvatarImg}
                  width={136}
                  height={136}
                  loading="lazy"
                />
              </div>

              <h3 className={styles.devName}>{dev.name}</h3>
              <div className={styles.devRole}>{dev.role}</div>
              <div className={styles.devFocus}>{dev.focus}</div>
              <p className={styles.devBio}>{dev.bio}</p>

              <div className={styles.devLinks}>
                <a
                  href={dev.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.devLinkBtn}
                >
                  GitHub Profile ↗
                </a>
                <a
                  href={dev.portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.devLinkBtn} ${styles.devPortfolioBtn}`}
                >
                  Portfolio ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------------------
          Dev Log (#journey)
          -------------------------------------------------------------------- */}
      <section id="journey" className={styles.section} aria-label="Development Log">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>// DEV LOG</span>
          <h2 className={styles.sectionTitle}>CHRONICLES OF CREATION</h2>
          <p className={styles.sectionSubtitle}>
            From initial TypeScript prototype to open-source browser sword fighting game.
          </p>
        </div>

        <div className={styles.journeyTimeline}>
          {DEV_LOG.map(entry => (
            <div key={entry.step} className={styles.timelineItem}>
              <div className={styles.timelineSeal} aria-hidden="true">
                {entry.step}
              </div>
              <div className={styles.timelineContent}>
                <div className={styles.timelineHeader}>
                  <h3 className={styles.timelineTitle}>{entry.title}</h3>
                  <span className={styles.timelinePeriod}>{entry.phase}</span>
                </div>
                <p className={styles.timelineBody}>{entry.notes}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------------------
          Final Challenger Call To Action
          -------------------------------------------------------------------- */}
      <section className={styles.ctaBanner} aria-label="Final Call to Action">
        <div className={styles.ctaContent}>
          <img
            src="/crown-logo.png"
            alt="Last-Crown Logo"
            width={72}
            height={72}
            style={{
              imageRendering: 'pixelated',
            }}
          />
          <h2 className={styles.ctaTitle}>CHALLENGER APPROACHING</h2>
          <p className={styles.ctaSubtitle}>
            Zero downloads. Zero installation. Fight directly in your browser.
          </p>
          <div className={styles.heroCtaGroup} style={{ marginTop: '12px' }}>
            <Link href="/game" className={styles.heroPrimaryBtn}>
              <span>START FIGHTING NOW</span>
            </Link>
            <a
              href="https://github.com/mujahidalmahi/last-crown"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.heroSecondaryBtn}
            >
              <span>⭐</span>
              <span>STAR ON GITHUB</span>
            </a>
          </div>
        </div>
      </section>

      {/* Retro Footer (Landing Page Only) */}
      <Footer />
    </div>
  );
}
