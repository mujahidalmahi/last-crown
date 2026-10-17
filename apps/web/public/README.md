# Static Assets & Public Resources

This directory contains static assets served by `@last-crown/web`. Assets in this directory are mapped directly to `/` at runtime.

---

## Directory Organization

```text
apps/web/public/
├── assets/
│   ├── backgrounds/   # High-resolution arena backdrops and screen banners (JPG/PNG)
│   ├── ui/            # Retro arcade UI components, beveled card frames, button textures (PNG)
│   ├── sprites/       # Character spritesheets and combat animations
│   ├── effects/       # Particle sprites, hit sparks, slash trails
│   ├── audio/         # Pre-rendered SFX and ambient audio cues
│   └── fonts/         # Web font fallbacks (Press Start 2P, etc.)
└── favicon/           # PWA manifests, Apple touch icons, multi-size browser favicons
```

---

## Asset Guidelines & Specifications

### 1. Arena Backgrounds (`assets/backgrounds/`)

- **Native Resolution**: Standard 16:9 canvas ratio (`1920x1080` or `1280x720`).
- **Format**: Optimized JPEG (quality 82-88%) or compressed WebP/PNG to balance visual fidelity with fast asset streaming.
- **Current Arena Backdrops**:
  - `playground.jpg`: **The Royal Colosseum** (Grand gladiatorial colosseum at twilight)
  - `playground2.jpg`: **Dragon's Roost** (Volcanic caldera fortress with crimson skies)
  - `playground3.jpg`: **Stormwatch Spire** (Rain-swept cliffside battlement with lightning)
  - `playground4.jpg`: **Seaside Fortress** (Coastal sun-drenched bastion over tempestuous waters)
  - `localbg.jpg`: **Hall of Duelists** (Local 2-player character selection backdrop)
  - `settings.jpg`: **Keep Treasury** (Dungeon chamber background for settings & room lobby)
  - `cover.jpg` / `cover1.jpg`: **Hero Banners** (Landing portal hero illustrations)

### 2. Retro Arcade UI Textures (`assets/ui/`)

- **Pixel Art Fidelity**: Unfiltered pixel rendering with clean 1-bit or 8-bit alpha channels.
- **Format**: 32-bit PNG with transparency (`PNG-24` / `PNG-32`).
- **Styling Standards**:
  - Gold buttons (`button-gold-*.png`): Primary calls to action (Duel, Create Room, Fight Again).
  - Steel & stone buttons (`button-steel-*.png`, `button-stone-*.png`): Secondary controls (Enter Code, Settings).
  - Card frames (`*-card.png`, `victory-card-*.png`): 4px beveled retro frames with gold/moss borders.

### 3. PWA & Favicon Icons (`favicon/`)

- **Standards Compliant**: Meets Web App Manifest and Apple iOS icon specifications.
  - `favicon.ico`: Multi-size ICO (16x16, 32x32, 48x48)
  - `favicon-16x16.png` & `favicon-32x32.png`: Standard browser tab favicons
  - `apple-touch-icon.png`: 180x180 PNG with solid background for iOS Home Screen
  - `android-chrome-192x192.png` & `android-chrome-512x512.png`: Android PWA splash and maskable icons

---

## Optimization Pipeline

Before committing new visual assets:

1. Run lossless PNG compression: `pngquant --strip --speed 1` or `oxipng -o 4`.
2. Ensure image resolution does not exceed `1920x1080` unless explicitly designed for HiDPI/Retina displays.
3. Test loading times on 3G network throttle via Chrome DevTools to ensure sub-500ms scene transitions.
