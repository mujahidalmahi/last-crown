'use client';

import React from 'react';
import { VoiceChatState } from './useVoiceChat';

export interface VoiceControlsProps {
  voice: VoiceChatState;
  compact?: boolean;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({ voice, compact = false }) => {
  const {
    isSupported,
    status,
    isMuted,
    isDeafened,
    isUserSpeaking,
    isOpponentSpeaking,
    opponentInVoice,
    isOpponentMuted,
    error,
    joinVoice,
    leaveVoice,
    toggleMute,
    toggleDeafen,
  } = voice;

  if (!isSupported) {
    return null;
  }

  // 1. Disconnected state: Single clean CTA button
  if (status === 'disconnected') {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', pointerEvents: 'auto' }}>
        <button
          type="button"
          onClick={joinVoice}
          title="Enable free peer-to-peer voice chat with your opponent"
          style={{
            backgroundColor: '#0c101a',
            color: '#f1c40f',
            border: '2px solid var(--border-gold)',
            borderRadius: '4px',
            padding: compact ? '6px 10px' : '7px 14px',
            fontFamily: "'Press Start 2P', monospace",
            fontSize: compact ? '0.62rem' : '0.68rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow:
              'inset 0 -2px 0 rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 3px 0 #000',
            transition: 'transform 0.08s ease',
          }}
        >
          <span style={{ fontSize: '0.85rem' }}>🎙️</span>
          <span>{compact ? 'Voice' : 'Voice Chat'}</span>
        </button>
      </div>
    );
  }

  // 2. Requesting Mic Permissions
  if (status === 'requesting_permission') {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#0c101a',
          border: '2px solid #f1c40f',
          borderRadius: '4px',
          padding: '6px 12px',
          color: '#f1c40f',
          fontFamily: "'Press Start 2P', monospace",
          fontSize: '0.62rem',
          letterSpacing: '0.04em',
          boxShadow: 'inset 0 -2px 0 rgba(0, 0, 0, 0.8), 0 3px 0 #000',
          pointerEvents: 'auto',
        }}
      >
        <span style={{ animation: 'pulse 0.8s linear infinite' }}>⏳</span>
        <span>Granting Mic...</span>
      </div>
    );
  }

  // 3. User Mic Active, Waiting for Rival to enable voice
  if (status === 'waiting_rival') {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#0c101a',
          border: '2px solid var(--border-gold)',
          borderRadius: '4px',
          padding: '4px 8px',
          boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.8), 0 3px 0 #000',
          pointerEvents: 'auto',
          fontFamily: "'Press Start 2P', monospace",
        }}
      >
        {/* Local Mic button while waiting */}
        <button
          type="button"
          onClick={toggleMute}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: isMuted ? '#3a1010' : '#142018',
            border: isMuted ? '2px solid #ef4444' : '2px solid #22c55e',
            borderRadius: '3px',
            padding: '4px 8px',
            color: isMuted ? '#f87171' : '#4ade80',
            fontFamily: 'inherit',
            fontSize: '0.58rem',
            cursor: 'pointer',
            boxShadow: 'inset 0 -2px 0 rgba(0, 0, 0, 0.8)',
          }}
        >
          <span>{isMuted ? '🔇' : '🎙️'}</span>
          <span>{isMuted ? 'Muted' : 'Mic On'}</span>
        </button>

        {/* Rival prompt badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '2px 6px',
            fontSize: '0.55rem',
            color: '#cbd5e1',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              backgroundColor: '#eab308',
              boxShadow: '0 0 6px #eab308',
            }}
          />
          <span>{compact ? 'Waiting...' : 'Waiting Rival...'}</span>
        </div>

        {/* Cancel button */}
        <button
          type="button"
          onClick={leaveVoice}
          title="Turn off voice chat"
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            padding: '2px 4px',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontFamily: 'inherit',
          }}
        >
          ✕
        </button>
      </div>
    );
  }

  // 4. Connecting P2P handshake
  if (status === 'connecting') {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#0c101a',
          border: '2px solid #3b82f6',
          borderRadius: '4px',
          padding: '5px 10px',
          color: '#60a5fa',
          fontFamily: "'Press Start 2P', monospace",
          fontSize: '0.6rem',
          boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.8), 0 3px 0 #000',
          pointerEvents: 'auto',
        }}
      >
        <span style={{ animation: 'pulse 0.8s linear infinite' }}>⏳</span>
        <span>{compact ? 'Connecting...' : 'Connecting P2P...'}</span>
        <button
          type="button"
          onClick={leaveVoice}
          title="Cancel"
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            padding: '2px 4px',
            cursor: 'pointer',
            fontSize: '0.75rem',
            marginLeft: '4px',
            fontFamily: 'inherit',
          }}
        >
          ✕
        </button>
      </div>
    );
  }

  // 5. Error state
  if (status === 'error') {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#260a0a',
          border: '2px solid #ef4444',
          borderRadius: '4px',
          padding: '6px 10px',
          color: '#fca5a5',
          fontFamily: "'Press Start 2P', monospace",
          fontSize: '0.58rem',
          pointerEvents: 'auto',
          maxWidth: '340px',
          boxShadow: '0 3px 0 #000',
        }}
        title={error || 'Microphone error'}
      >
        <span>⚠️</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {error || 'Mic error'}
        </span>
        <button
          type="button"
          onClick={joinVoice}
          style={{
            backgroundColor: '#ef4444',
            color: '#fff',
            border: 'none',
            borderRadius: '2px',
            padding: '3px 6px',
            fontSize: '0.55rem',
            fontFamily: 'inherit',
            fontWeight: 800,
            cursor: 'pointer',
            marginLeft: 'auto',
          }}
        >
          Retry
        </button>
        <button
          type="button"
          onClick={leaveVoice}
          style={{
            background: 'none',
            border: 'none',
            color: '#fca5a5',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontFamily: 'inherit',
          }}
        >
          ✕
        </button>
      </div>
    );
  }

  // 6. Connected state: Full Live Gothic Retro Voice Bar
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: '#0a0e16',
        border: '2px solid var(--border-gold)',
        borderRadius: '4px',
        padding: '4px 8px',
        boxShadow:
          'inset 0 0 10px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 3px 0 #000',
        pointerEvents: 'auto',
        fontFamily: "'Press Start 2P', monospace",
      }}
    >
      {/* Local Microphone Toggle */}
      <button
        type="button"
        onClick={toggleMute}
        title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: isMuted ? '#2b0f0f' : isUserSpeaking ? '#0f2918' : '#141a24',
          border: isMuted
            ? '2px solid #ef4444'
            : isUserSpeaking
              ? '2px solid #2ecc71'
              : '2px solid #334155',
          borderRadius: '3px',
          padding: '4px 8px',
          color: isMuted ? '#f87171' : isUserSpeaking ? '#4ade80' : '#cbd5e1',
          fontFamily: 'inherit',
          fontSize: '0.58rem',
          cursor: 'pointer',
          boxShadow: isUserSpeaking ? '0 0 8px rgba(46, 204, 113, 0.6)' : 'none',
          transition: 'transform 0.08s ease',
        }}
      >
        <span>{isMuted ? '🔇' : '🎙️'}</span>
        <span>{isMuted ? 'Muted' : 'Mic On'}</span>
        {isUserSpeaking && !isMuted && (
          <span
            style={{
              width: '6px',
              height: '6px',
              backgroundColor: '#2ecc71',
              boxShadow: '0 0 6px #2ecc71',
              animation: 'pulse 0.4s infinite alternate',
            }}
          />
        )}
      </button>

      {/* Opponent Hearing / Deafen Toggle */}
      <button
        type="button"
        onClick={toggleDeafen}
        title={isDeafened ? 'Undeafen rival audio' : 'Mute rival audio'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: isDeafened ? '#2b0f0f' : isOpponentSpeaking ? '#0f1f33' : '#141a24',
          border: isDeafened
            ? '2px solid #ef4444'
            : isOpponentSpeaking
              ? '2px solid #3b82f6'
              : '2px solid #334155',
          borderRadius: '3px',
          padding: '4px 8px',
          color: isDeafened ? '#f87171' : isOpponentSpeaking ? '#60a5fa' : '#cbd5e1',
          fontFamily: 'inherit',
          fontSize: '0.58rem',
          cursor: 'pointer',
          boxShadow: isOpponentSpeaking ? '0 0 8px rgba(52, 152, 219, 0.6)' : 'none',
          transition: 'transform 0.08s ease',
        }}
      >
        <span>{isDeafened ? '🔈' : '🔊'}</span>
        <span>{isDeafened ? 'Deaf' : 'Audio'}</span>
        {isOpponentSpeaking && !isDeafened && (
          <span
            style={{
              width: '6px',
              height: '6px',
              backgroundColor: '#38bdf8',
              boxShadow: '0 0 6px #38bdf8',
              animation: 'pulse 0.4s infinite alternate',
            }}
          />
        )}
      </button>

      {/* Opponent Connection & Speech Indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '2px 6px',
          fontSize: '0.55rem',
          color: opponentInVoice ? (isOpponentMuted ? '#f87171' : '#34d399') : '#94a3b8',
        }}
        title={
          opponentInVoice
            ? isOpponentMuted
              ? 'Opponent has muted their microphone'
              : isOpponentSpeaking
                ? 'Opponent is speaking'
                : 'Opponent connected in voice'
            : 'Opponent has not enabled voice yet'
        }
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            backgroundColor: opponentInVoice
              ? isOpponentMuted
                ? '#ef4444'
                : '#10b981'
              : '#64748b',
            boxShadow: opponentInVoice
              ? isOpponentMuted
                ? '0 0 6px #ef4444'
                : '0 0 6px #10b981'
              : 'none',
          }}
        />
        <span>
          {opponentInVoice
            ? isOpponentMuted
              ? 'Rival Muted'
              : isOpponentSpeaking
                ? 'Rival Speaking'
                : 'Rival Live'
            : 'Waiting'}
        </span>
      </div>

      {/* Disconnect Voice Button */}
      <button
        type="button"
        onClick={leaveVoice}
        title="Leave voice chat"
        style={{
          background: 'none',
          border: 'none',
          color: '#94a3b8',
          padding: '3px 6px',
          cursor: 'pointer',
          fontSize: '0.75rem',
          fontFamily: 'inherit',
          transition: 'color 0.15s ease',
        }}
      >
        ✕
      </button>
    </div>
  );
};
