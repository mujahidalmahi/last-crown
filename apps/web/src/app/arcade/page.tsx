'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { GameSimulationSnapshot } from '@last-crown/game-core';

const PhaserGameContainer = dynamic(
  () =>
    import('../../features/game/PhaserGameContainer').then(mod => mod.PhaserGameContainer),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#050810',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          zIndex: 9999,
        }}
      >
        <img
          src="/icon.png"
          alt="Last-Crown Logo"
          width={64}
          height={64}
          style={{ imageRendering: 'pixelated', filter: 'drop-shadow(0 0 12px #f1c40f)' }}
        />
        <p
          style={{
            fontFamily: "'Press Start 2P', monospace",
            color: '#ffd700',
            fontSize: '0.9rem',
            letterSpacing: '0.12em',
          }}
        >
          ENTERING ARCADE GAUNTLET...
        </p>
      </div>
    ),
  }
);

interface ArcadeStage {
  stage: number;
  opponentName: string;
  opponentPreset: string;
  botDifficulty: 'novice' | 'adept' | 'expert' | 'master';
  arenaId: string;
  arenaName: string;
  title: string;
  isBoss?: boolean;
}

const ARCADE_STAGES: ArcadeStage[] = [
  {
    stage: 1,
    opponentName: 'Sir Cedric',
    opponentPreset: 'knight',
    botDifficulty: 'novice',
    arenaId: 'coloseum',
    arenaName: 'Colosseum',
    title: 'The Iron Sovereign',
  },
  {
    stage: 2,
    opponentName: 'Grimwood',
    opponentPreset: 'marauder',
    botDifficulty: 'adept',
    arenaId: 'dragonland',
    arenaName: 'Dragonland',
    title: 'The Blood Cleaver',
  },
  {
    stage: 3,
    opponentName: 'Valerius',
    opponentPreset: 'vanguard',
    botDifficulty: 'expert',
    arenaId: 'stormforce',
    arenaName: 'StormForce',
    title: 'The Realm Hammer',
  },
  {
    stage: 4,
    opponentName: 'Aurelia',
    opponentPreset: 'duelist',
    botDifficulty: 'master',
    arenaId: 'seaside',
    arenaName: 'SeaSide Cliff',
    title: 'The Windblade',
  },
  {
    stage: 5,
    opponentName: 'The Shadow Sovereign',
    opponentPreset: 'marauder',
    botDifficulty: 'master',
    arenaId: 'coloseum',
    arenaName: 'Imperial Throne',
    title: 'Final Boss of the Realm',
    isBoss: true,
  },
];

export default function ArcadePage() {
  const router = useRouter();
  const [currentStageIdx, setCurrentStageIdx] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [elapsedTimeSec, setElapsedTimeSec] = useState<number>(0);
  const [stageCleared, setStageCleared] = useState<boolean>(false);
  const [arcadeVictory, setArcadeVictory] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [matchKey, setMatchKey] = useState<number>(1);

  const stage = ARCADE_STAGES[currentStageIdx] || ARCADE_STAGES[0]!;
  const handledMatchEndRef = useRef<boolean>(false);

  // Speedrun timer
  useEffect(() => {
    if (stageCleared || arcadeVictory || gameOver) return;
    const interval = setInterval(() => {
      setElapsedTimeSec(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [stageCleared, arcadeVictory, gameOver]);

  const handleSnapshot = useCallback(
    (snap: GameSimulationSnapshot) => {
      if (snap.matchState === 'match_over' && !handledMatchEndRef.current) {
        handledMatchEndRef.current = true;
        const p1Won = snap.winnerId === snap.p1.id;

        if (p1Won) {
          const stageScoreBonus = 5000 + (stage.isBoss ? 10000 : 0);
          setScore(prev => prev + stageScoreBonus);

          if (currentStageIdx >= ARCADE_STAGES.length - 1) {
            setArcadeVictory(true);
          } else {
            setStageCleared(true);
          }
        } else {
          setGameOver(true);
        }
      }
    },
    [currentStageIdx, stage.isBoss]
  );

  const handleNextStage = () => {
    handledMatchEndRef.current = false;
    setStageCleared(false);
    setCurrentStageIdx(prev => prev + 1);
    setMatchKey(prev => prev + 1);
  };

  const handleRetryStage = () => {
    handledMatchEndRef.current = false;
    setGameOver(false);
    setMatchKey(prev => prev + 1);
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#050810',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Floating Arcade Header Overlay */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          backgroundColor: 'rgba(8, 12, 20, 0.92)',
          border: '2px solid #f1c40f',
          borderRadius: '4px',
          padding: '6px 18px',
          boxShadow: '0 4px 0 #000, 0 0 16px rgba(241, 196, 15, 0.4)',
          zIndex: 400,
          fontFamily: "'Press Start 2P', monospace",
          fontSize: '0.68rem',
        }}
      >
        <div style={{ color: '#ffd700' }}>
          STAGE {stage.stage}/{ARCADE_STAGES.length}:{' '}
          <span style={{ color: stage.isBoss ? '#ff4757' : '#fff' }}>
            {stage.opponentName.toUpperCase()}
          </span>
        </div>
        <div style={{ color: '#2ed573' }}>
          SCORE: {score.toLocaleString()}
        </div>
        <div style={{ color: '#00cec9' }}>
          TIME: {formatTime(elapsedTimeSec)}
        </div>
      </div>

      {/* Phaser Canvas */}
      <PhaserGameContainer
        key={matchKey}
        mode="singleplayer"
        arenaId={stage.arenaId}
        playerPreset="knight"
        opponentPreset={stage.opponentPreset}
        botDifficulty={stage.botDifficulty}
        botName={stage.opponentName}
        onSnapshot={handleSnapshot}
        onExit={() => router.push('/game')}
      />

      {/* Stage Clear Modal */}
      {stageCleared && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            zIndex: 1000,
            fontFamily: "'Press Start 2P', monospace",
          }}
        >
          <div
            style={{
              fontSize: 'clamp(1.5rem, 3.5vw, 2.4rem)',
              color: '#ffd700',
              textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 4px 0 #000, 0 0 25px rgba(255, 215, 0, 0.9)',
              textAlign: 'center',
            }}
          >
            STAGE {stage.stage} CLEARED!
          </div>
          <div style={{ color: '#2ed573', fontSize: '0.9rem' }}>
            +5,000 VICTORY POINTS EARNED
          </div>
          <div style={{ color: '#e0e0e0', fontSize: '0.75rem', marginTop: '8px' }}>
            NEXT OPPONENT: {ARCADE_STAGES[currentStageIdx + 1]?.opponentName.toUpperCase()} (
            {ARCADE_STAGES[currentStageIdx + 1]?.arenaName})
          </div>
          <button
            type="button"
            onClick={handleNextStage}
            style={{
              marginTop: '16px',
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '0.85rem',
              color: '#070b12',
              backgroundColor: '#ffd700',
              border: '2px solid #fff',
              borderRadius: '4px',
              padding: '12px 28px',
              cursor: 'pointer',
              boxShadow: '0 4px 0 #b38f00, 0 0 20px rgba(255, 215, 0, 0.6)',
            }}
          >
            ADVANCE TO NEXT STAGE ▶
          </button>
        </div>
      )}

      {/* Final Arcade Victory Screen */}
      {arcadeVictory && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(5, 8, 16, 0.94)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            zIndex: 1000,
            fontFamily: "'Press Start 2P', monospace",
          }}
        >
          <div
            style={{
              fontSize: 'clamp(1.8rem, 4.2vw, 3rem)',
              color: '#ffd700',
              textShadow: '-3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 3px 3px 0 #000, 0 6px 0 #000, 0 0 35px rgba(255, 215, 0, 1)',
              textAlign: 'center',
            }}
          >
            👑 ARCADE CHAMPION! 👑
          </div>
          <div style={{ color: '#fff', fontSize: '0.9rem', maxWidth: '600px', textAlign: 'center', lineHeight: '1.6' }}>
            You defeated the Shadow Sovereign and conquered all 5 stages of the Royal Ladder!
          </div>
          <div
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              border: '2px solid #ffd700',
              padding: '16px 32px',
              borderRadius: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              alignItems: 'center',
              marginTop: '10px',
            }}
          >
            <div style={{ color: '#2ed573', fontSize: '1rem' }}>FINAL SCORE: {score.toLocaleString()} PTS</div>
            <div style={{ color: '#00cec9', fontSize: '0.9rem' }}>TOTAL TIME: {formatTime(elapsedTimeSec)}</div>
          </div>
          <button
            type="button"
            onClick={() => router.push('/game')}
            style={{
              marginTop: '20px',
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '0.85rem',
              color: '#070b12',
              backgroundColor: '#ffd700',
              border: '2px solid #fff',
              borderRadius: '4px',
              padding: '12px 28px',
              cursor: 'pointer',
              boxShadow: '0 4px 0 #b38f00, 0 0 20px rgba(255, 215, 0, 0.6)',
            }}
          >
            RETURN TO CASTLE HALL 🏰
          </button>
        </div>
      )}

      {/* Game Over Modal */}
      {gameOver && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(15, 5, 5, 0.92)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            zIndex: 1000,
            fontFamily: "'Press Start 2P', monospace",
          }}
        >
          <div
            style={{
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              color: '#ff4757',
              textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 4px 0 #000, 0 0 25px rgba(255, 71, 87, 0.9)',
            }}
          >
            DEFEATED AT STAGE {stage.stage}
          </div>
          <div style={{ color: '#e0e0e0', fontSize: '0.8rem' }}>
            Current Score: {score.toLocaleString()} PTS
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '14px' }}>
            <button
              type="button"
              onClick={handleRetryStage}
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '0.75rem',
                color: '#fff',
                backgroundColor: '#e67e22',
                border: '2px solid #fff',
                borderRadius: '4px',
                padding: '10px 20px',
                cursor: 'pointer',
                boxShadow: '0 4px 0 #a85813',
              }}
            >
              RETRY STAGE ⚔️
            </button>
            <button
              type="button"
              onClick={() => router.push('/game')}
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '0.75rem',
                color: '#fff',
                backgroundColor: '#34495e',
                border: '2px solid #fff',
                borderRadius: '4px',
                padding: '10px 20px',
                cursor: 'pointer',
                boxShadow: '0 4px 0 #1a252f',
              }}
            >
              QUIT TO HALL 🏰
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
