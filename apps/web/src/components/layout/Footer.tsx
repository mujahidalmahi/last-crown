'use client';

import React from 'react';
import Link from 'next/link';
import styles from './Footer.module.css';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className={styles.footerWrapper} role="contentinfo" aria-label="Site Footer">
      {/* --------------------------------------------------------------------
          Giant Atmospheric Watermark: Last-Crown: The winner takes it all
          -------------------------------------------------------------------- */}
      <div className={styles.watermarkContainer} aria-hidden="true">
        <span className={styles.watermarkText}>LAST-CROWN</span>
        <span className={styles.watermarkSubtext}>THE WINNER TAKES IT ALL</span>
        <img src="/crown-logo.png" alt="" className={styles.watermarkCrown} />
      </div>

      {/* --------------------------------------------------------------------
          Top Filigree Ornamental Accent Bar
          -------------------------------------------------------------------- */}
      <div className={styles.topFiligreeBar} aria-hidden="true">
        <div className={styles.filigreeLine} />
        <div className={styles.filigreeCenter}>
          <img
            src="/crown-logo.png"
            alt=""
            width={18}
            height={18}
            className={styles.filigreeIcon}
          />
          <span>THE WINNER TAKES IT ALL</span>
          <img
            src="/crown-logo.png"
            alt=""
            width={18}
            height={18}
            className={styles.filigreeIcon}
          />
        </div>
        <div className={styles.filigreeLine} />
      </div>

      {/* --------------------------------------------------------------------
          Main Four-Column Content Grid
          -------------------------------------------------------------------- */}
      <div className={styles.footerMain}>
        <div className={styles.footerGrid}>
          {/* Column 1: Brand & Lore */}
          <div className={styles.brandColumn}>
            <Link href="/" className={styles.brandHeader}>
              <img
                src="/crown-logo.png"
                alt="Last-Crown Logo"
                width={38}
                height={38}
                className={styles.brandLogo}
              />
              <div className={styles.brandTitleGroup}>
                <span className={styles.brandTitle}>LAST-CROWN</span>
                <span className={styles.brandSubtitle}>The winner takes it all</span>
              </div>
            </Link>

            <p className={styles.brandDesc}>
              An authentic 2D medieval sword fighter running natively in modern web browsers.
              Engineered with deterministic 60Hz physics, frame-perfect parrying,
              server-authoritative Colyseus netcode, WebRTC peer voice chat, and instant QR phone
              gamepads.
            </p>
          </div>

          {/* Column 2: Combat & Game Modes */}
          <div className={styles.navColumn}>
            <h4 className={styles.columnHeading}>
              <span aria-hidden="true">⚔️</span> Modes &amp; Play
            </h4>
            <ul className={styles.columnList}>
              <li>
                <Link href="/arcade" className={styles.footerLink}>
                  Arcade Gauntlet (5 Stages)
                </Link>
              </li>
              <li>
                <Link href="/training" className={styles.footerLink}>
                  Training Dojo (Frame Data)
                </Link>
              </li>
              <li>
                <Link href="/game" className={styles.footerLink}>
                  The Game Hub
                </Link>
              </li>
              <li>
                <Link href="/play" className={styles.footerLink}>
                  Solo Crucible (AI)
                </Link>
              </li>
              <li>
                <Link href="/local" className={styles.footerLink}>
                  Couch Co-Op (2-Player)
                </Link>
              </li>
              <li>
                <Link href="/room" className={styles.footerLink}>
                  Online 1v1 Room
                </Link>
              </li>
              <li>
                <Link href="/controller" className={styles.footerLink}>
                  Phone Controller
                </Link>
              </li>
              <li>
                <Link href="/settings" className={styles.footerLink}>
                  Armory &amp; Calibration
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Arenas & Mechanics */}
          <div className={styles.navColumn}>
            <h4 className={styles.columnHeading}>
              <span aria-hidden="true">🛡️</span> Arenas &amp; Depth
            </h4>
            <ul className={styles.columnList}>
              <li>
                <a href="#screenshots" className={styles.footerLink}>
                  Bastion Courtyard
                </a>
              </li>
              <li>
                <a href="#screenshots" className={styles.footerLink}>
                  DragonLand Caldera
                </a>
              </li>
              <li>
                <a href="#screenshots" className={styles.footerLink}>
                  StormForce Ramparts
                </a>
              </li>
              <li>
                <a href="#screenshots" className={styles.footerLink}>
                  SeaSide Pirate Haven
                </a>
              </li>
              <li>
                <a href="#mechanics" className={styles.footerLink}>
                  180ms Parry Window
                </a>
              </li>
              <li>
                <a href="#mechanics" className={styles.footerLink}>
                  Stamina Guard Breaks
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Developers & Open Source */}
          <div className={styles.navColumn}>
            <h4 className={styles.columnHeading}>
              <span aria-hidden="true">📜</span> Creators &amp; Code
            </h4>
            <ul className={styles.columnList}>
              <li>
                <Link href="/about" className={styles.footerLink}>
                  About the Creators &amp; Lore
                </Link>
              </li>
              <li>
                <a
                  href="https://mujahidmahi.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.footerLink}
                >
                  Mujahid Al Mahi
                </a>
              </li>
              <li>
                <a
                  href="https://portfolio-v2-smoky-phi.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.footerLink}
                >
                  Shahariar Hossain Jibon
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/mujahidalmahi/last-crown"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.footerLink}
                >
                  GitHub Repository ↗
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/mujahidalmahi/last-crown/blob/main/CONTRIBUTING.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.footerLink}
                >
                  Contributing Guide
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/mujahidalmahi/last-crown/blob/main/SECURITY.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.footerLink}
                >
                  Security Policy
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/mujahidalmahi/last-crown/blob/main/LICENSE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.footerLink}
                >
                  MIT License
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* --------------------------------------------------------------------
            Quick Action Bar: Direct Play & Back to Top
            -------------------------------------------------------------------- */}
        <div className={styles.quickActionBar}>
          <div className={styles.quickActionText}>
            <span aria-hidden="true">👑</span>
            <span>Step into the crucible — zero downloads required</span>
          </div>

          <div className={styles.quickActionButtons}>
            <Link href="/game" className={styles.playActionBtn}>
              <span>PLAY THE GAME</span>
            </Link>

            <button
              type="button"
              onClick={scrollToTop}
              className={styles.backToTopBtn}
              title="Return to top of page"
            >
              <span aria-hidden="true">▲</span>
              <span>TOP</span>
            </button>
          </div>
        </div>

        {/* --------------------------------------------------------------------
            Sub-Footer: Copyright, Authors & Tech Stack Badges
            -------------------------------------------------------------------- */}
        <div className={styles.subFooter}>
          <div className={styles.subFooterMeta}>
            <div className={styles.copyrightText}>
              © 2026 <strong>LAST-CROWN</strong> — The winner takes it all. All rights reserved.
            </div>

            <div className={styles.creditsText}>
              Forged with pride by <span>Mujahid Al Mahi</span> &amp;{' '}
              <span>Shahariar Hossain Jibon</span>.
            </div>
          </div>

          <div className={styles.techBadgesRow} aria-label="Technology Stack">
            <span className={styles.techBadge}>Next.js 14</span>
            <span className={styles.techBadge}>Phaser 3</span>
            <span className={styles.techBadge}>Colyseus</span>
            <span className={styles.techBadge}>WebRTC</span>
            <span className={styles.techBadge}>TypeScript</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
