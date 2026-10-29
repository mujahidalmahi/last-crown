import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Footer } from '../../components/layout/Footer';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'About the Creators & Game | Last-Crown',
  description:
    'Meet the developers of Last-Crown: Mujahid Al Mahi and Shahariar Hossain Jibon. Discover the lore, deterministic 60Hz physics, breakable command grabs, and open-source architecture behind the browser fighting game.',
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: 'About the Creators & Game — Last-Crown',
    description:
      'The story, engineering architecture, and creators behind Last-Crown — Mujahid Al Mahi & Shahariar Hossain Jibon.',
    url: 'https://last-crown.top/about',
    siteName: 'Last-Crown',
    images: [
      {
        url: '/assets/backgrounds/cover.jpg',
        width: 1200,
        height: 630,
        alt: 'Last-Crown — The winner takes it all',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About the Creators & Game — Last-Crown',
    description:
      'Engineered by Mujahid Al Mahi and Shahariar Hossain Jibon. Deterministic 60Hz physics, smart AI, and local 2-player phone controllers.',
    images: ['/assets/backgrounds/cover.jpg'],
  },
};

export default function AboutPage() {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <header className={styles.header}>
          <span className={styles.badge}>// ARCHIVES &amp; CREDITS</span>
          <h1 className={styles.title}>LAST-CROWN: THE WINNER TAKES IT ALL</h1>
          <p className={styles.subtitle}>
            A pure HTML5 retro pixel-art browser fighting game engineered from the ground up by{' '}
            <strong style={{ color: '#ffd700' }}>Mujahid Al Mahi</strong> and{' '}
            <strong style={{ color: '#ffd700' }}>Shahariar Hossain Jibon</strong>.
          </p>
        </header>

        {/* Section 1: Meet the Creators */}
        <section className={styles.section} aria-labelledby="creators-heading">
          <h2 id="creators-heading" className={styles.sectionTitle}>
            MEET THE DEVELOPERS
          </h2>
          <p className={styles.leadText}>
            Last-Crown was conceived and forged by two independent developers driven by the passion to
            build a zero-install, esports-grade retro fighting game capable of running seamlessly in any modern web browser.
          </p>

          <div className={styles.developersGrid}>
            {/* Mujahid Al Mahi */}
            <article className={styles.devCard}>
              <div className={styles.devHeader}>
                <Image
                  src="/assets/developers/mujahid-al-mahi.jpg"
                  alt="Mujahid Al Mahi - Co-Creator & Systems Engineer"
                  width={72}
                  height={72}
                  className={styles.devAvatar}
                />
                <div className={styles.devInfo}>
                  <h3 className={styles.devName}>Mujahid Al Mahi</h3>
                  <span className={styles.devRole}>Co-Creator</span>
                  <span className={styles.devFocus}>Core Game Physics, Controls &amp; Netcode</span>
                </div>
              </div>
              <p className={styles.devBio}>
                Engineered Last-Crown&apos;s deterministic 60Hz physics core, custom integer collision hitboxes,
                frame-cancel windows, responsive player controlling mechanics, and server-authoritative Colyseus netcode.
                Specializes in low-latency systems, state synchronization, and full-stack architecture.
              </p>
              <div className={styles.devLinks}>
                <a
                  href="https://github.com/mujahidalmahi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.devLink}
                >
                  GitHub
                </a>
                <a
                  href="https://mujahidmahi.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.devLink}
                >
                  Portfolio
                </a>
              </div>
            </article>

            {/* Shahariar Hossain Jibon */}
            <article className={styles.devCard}>
              <div className={styles.devHeader}>
                <Image
                  src="/assets/developers/shahariar-hossain-jibon.jpg"
                  alt="Shahariar Hossain Jibon - Co-Creator & Visual Designer"
                  width={72}
                  height={72}
                  className={styles.devAvatar}
                />
                <div className={styles.devInfo}>
                  <h3 className={styles.devName}>Shahariar Hossain Jibon</h3>
                  <span className={styles.devRole}>Co-Creator</span>
                  <span className={styles.devFocus}>UI/UX, Responsiveness &amp; Visual Design</span>
                </div>
              </div>
              <p className={styles.devBio}>
                Crafted the 16-bit visual identity, responsive multi-device layout, retro interface, arena cinematography,
                and touch controller experience across desktop, mobile, and tablets. Specializes in frontend engineering,
                interactive aesthetics, and modern web ergonomics.
              </p>
              <div className={styles.devLinks}>
                <a
                  href="https://github.com/ShahariarJibon"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.devLink}
                >
                  GitHub
                </a>
                <a
                  href="https://portfolio-v2-smoky-phi.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.devLink}
                >
                  Portfolio
                </a>
              </div>
            </article>
          </div>
        </section>

        {/* Section 2: Technical Architecture */}
        <section className={styles.section} aria-labelledby="architecture-heading">
          <h2 id="architecture-heading" className={styles.sectionTitle}>
            ENGINEERING &amp; ARCHITECTURE
          </h2>
          <p className={styles.leadText}>
            Built with modern web standards and zero third-party commercial game engines, Last-Crown achieves
            frame-consistent determinism directly inside browser environments.
          </p>

          <div className={styles.architectureGrid}>
            <div className={styles.techCard}>
              <h3 className={styles.techTitle}>Deterministic 60Hz Physics</h3>
              <p className={styles.techDesc}>
                A decoupled simulation loop running at 16.66ms ticks using integer collision geometry to eliminate
                floating-point desyncs between client and server.
              </p>
            </div>
            <div className={styles.techCard}>
              <h3 className={styles.techTitle}>Colyseus Authoritative Netcode</h3>
              <p className={styles.techDesc}>
                Real-time room coordination with state reconciliation, input buffering, and anti-cheat validation
                for fair competitive 1v1 online matches.
              </p>
            </div>
            <div className={styles.techCard}>
              <h3 className={styles.techTitle}>WebRTC Low-Latency Voice</h3>
              <p className={styles.techDesc}>
                Peer-to-peer audio mesh with automatic NAT traversal and TURN fallback, allowing combatants to taunt
                and communicate during live duels.
              </p>
            </div>
            <div className={styles.techCard}>
              <h3 className={styles.techTitle}>Web Audio Synthesis</h3>
              <p className={styles.techDesc}>
                Zero static audio assets. Dynamic 3-layer transient stacking (click, mid crunch, sub-bass) and
                adaptive low-HP tension stems synthesized purely via native Web Audio oscillators.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Lore & Arenas */}
        <section className={styles.section} aria-labelledby="lore-heading">
          <h2 id="lore-heading" className={styles.sectionTitle}>
            THE FIVE REALMS &amp; WARRIOR LORE
          </h2>
          <p className={styles.leadText}>
            Champions from across the fractured empires fight for the sacred artifact that commands sovereignty:
          </p>

          <div className={styles.loreGrid}>
            <div className={styles.loreCard}>
              <h3 className={styles.loreHeader}>Bastion Courtyard (Colosseum)</h3>
              <p className={styles.techDesc}>
                The sun-drenched imperial arena where gladiators clash amid ancient stone pillars and the roar of spectators.
                Home to Sir Cedric the Loyal.
              </p>
            </div>
            <div className={styles.loreCard}>
              <h3 className={styles.loreHeader}>DragonLand Caldera</h3>
              <p className={styles.techDesc}>
                Treacherous stone bridges suspended over cascading rivers of molten magma under the gaze of the volcanic dragon.
                Haunt of Grimwood the Savage.
              </p>
            </div>
            <div className={styles.loreCard}>
              <h3 className={styles.loreHeader}>StormForce Ramparts</h3>
              <p className={styles.techDesc}>
                Gale-swept ramparts battered by downpours and lightning, testing warrior balance and reflex.
                Domain of Valerius the Swift.
              </p>
            </div>
            <div className={styles.loreCard}>
              <h3 className={styles.loreHeader}>SeaSide Pirate Haven</h3>
              <p className={styles.techDesc}>
                Decaying pirate docks and sandbanks where crashing oceanic surges shift the combat footing each round.
                Guarded by Aurelia the Radiant.
              </p>
            </div>
            <div className={styles.loreCard}>
              <h3 className={styles.loreHeader}>The Royal Keep</h3>
              <p className={styles.techDesc}>
                The sacred Gothic throne room where contenders meet their fate against The Shadow Sovereign and only the supreme
                victor claims the Last-Crown.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Call to Actions */}
        <div className={styles.actions}>
          <Link href="/game" className={styles.actionButton}>
            ⚔️ PLAY LAST-CROWN NOW
          </Link>
          <Link href="/arcade" className={styles.secondaryButton}>
            👑 ARCADE GAUNTLET
          </Link>
          <a
            href="https://github.com/mujahidalmahi/last-crown"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.secondaryButton}
          >
            ⭐ STAR ON GITHUB
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
}
