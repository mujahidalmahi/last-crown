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
            backgroundColor: 'rgba(10, 14, 22, 0.85)',
            color: '#f1c40f',
            border: '1px solid rgba(212, 175, 55, 0.5)',
            borderRadius: '6px',
            padding: compact ? '6px 12px' : '8px 16px',
            fontSize: compact ? '0.8rem' : '0.85rem',
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backdropFilter: 'blur(6px)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.6)',
            transition: 'all 0.15s ease',
          }}
        >
          <span style={{ fontSize: '1rem' }}>🎙️</span>
          <span>Voice Chat</span>
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
          backgroundColor: 'rgba(10, 14, 22, 0.92)',
          border: '1px solid rgba(241, 196, 15, 0.6)',
          borderRadius: '6px',
          padding: '6px 14px',
          color: '#f1c40f',
          fontSize: '0.8rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
          backdropFilter: 'blur(6px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
          pointerEvents: 'auto',
        }}
      >
        <span style={{ animation: 'spin 1.2s linear infinite' }}>⏳</span>
        <span>Grant Mic Access...</span>
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
          backgroundColor: 'rgba(10, 14, 22, 0.92)',
          border: '1px solid rgba(212, 175, 55, 0.4)',
          borderRadius: '8px',
          padding: '4px 8px',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.7)',
          pointerEvents: 'auto',
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
            backgroundColor: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.06)',
            border: isMuted ? '1px solid #ef4444' : '1px solid rgba(212, 175, 55, 0.3)',
            borderRadius: '5px',
            padding: '3px 8px',
            color: isMuted ? '#f87171' : '#f1c40f',
            fontSize: '0.76rem',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          <span>{isMuted ? '🔇' : '🎙️'}</span>
          <span>{isMuted ? 'Muted' : 'Mic Active'}</span>
        </button>

        {/* Rival prompt badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '2px 8px',
            fontSize: '0.76rem',
            color: '#cbd5e1',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#eab308',
              boxShadow: '0 0 6px #eab308',
            }}
          />
          <span>Waiting for Rival to enable voice...</span>
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
            padding: '2px 6px',
            cursor: 'pointer',
            fontSize: '0.85rem',
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
          backgroundColor: 'rgba(10, 14, 22, 0.92)',
          border: '1px solid rgba(52, 152, 219, 0.6)',
          borderRadius: '8px',
          padding: '4px 10px',
          color: '#60a5fa',
          fontSize: '0.8rem',
          fontWeight: 700,
          backdropFilter: 'blur(6px)',
          boxShadow: '0 4px 14px rgba(0,0,0,0.6)',
          pointerEvents: 'auto',
        }}
      >
        <span style={{ animation: 'spin 1.2s linear infinite' }}>⏳</span>
        <span>Connecting P2P Voice...</span>
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
            fontSize: '0.85rem',
            marginLeft: '4px',
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
          backgroundColor: 'rgba(50, 10, 10, 0.92)',
          border: '1px solid #ef4444',
          borderRadius: '6px',
          padding: '6px 12px',
          color: '#fca5a5',
          fontSize: '0.78rem',
          pointerEvents: 'auto',
          maxWidth: '340px',
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
            borderRadius: '4px',
            padding: '2px 8px',
            fontSize: '0.72rem',
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
            fontSize: '0.9rem',
          }}
        >
          ✕
        </button>
      </div>
    );
  }

  // 6. Connected state: Full Live Gothic Voice Bar
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: 'rgba(10, 14, 22, 0.94)',
        border: '1px solid rgba(212, 175, 55, 0.4)',
        borderRadius: '8px',
        padding: '4px 8px',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.7)',
        pointerEvents: 'auto',
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
          backgroundColor: isMuted
            ? 'rgba(239, 68, 68, 0.2)'
            : isUserSpeaking
              ? 'rgba(46, 204, 113, 0.25)'
              : 'rgba(255, 255, 255, 0.06)',
          border: isMuted
            ? '1px solid #ef4444'
            : isUserSpeaking
              ? '1px solid #2ecc71'
              : '1px solid rgba(212, 175, 55, 0.3)',
          borderRadius: '5px',
          padding: '4px 10px',
          color: isMuted ? '#f87171' : isUserSpeaking ? '#2ecc71' : '#cbd5e1',
          fontSize: '0.78rem',
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: isUserSpeaking ? '0 0 10px rgba(46, 204, 113, 0.5)' : 'none',
          transition: 'all 0.15s ease',
        }}
      >
        <span>{isMuted ? '🔇' : '🎙️'}</span>
        <span>{isMuted ? 'Muted' : 'Mic On'}</span>
        {isUserSpeaking && !isMuted && (
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
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
          backgroundColor: isDeafened
            ? 'rgba(239, 68, 68, 0.2)'
            : isOpponentSpeaking
              ? 'rgba(52, 152, 219, 0.25)'
              : 'rgba(255, 255, 255, 0.06)',
          border: isDeafened
            ? '1px solid #ef4444'
            : isOpponentSpeaking
              ? '1px solid #3498db'
              : '1px solid rgba(212, 175, 55, 0.3)',
          borderRadius: '5px',
          padding: '4px 10px',
          color: isDeafened ? '#f87171' : isOpponentSpeaking ? '#60a5fa' : '#cbd5e1',
          fontSize: '0.78rem',
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: isOpponentSpeaking ? '0 0 10px rgba(52, 152, 219, 0.5)' : 'none',
          transition: 'all 0.15s ease',
        }}
      >
        <span>{isDeafened ? '🔈' : '🔊'}</span>
        <span>{isDeafened ? 'Deafened' : 'Audio'}</span>
        {isOpponentSpeaking && !isDeafened && (
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#3498db',
              boxShadow: '0 0 6px #3498db',
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
          padding: '2px 8px',
          fontSize: '0.74rem',
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
            borderRadius: '50%',
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
            : 'Waiting Rival'}
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
          padding: '4px 6px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.85rem',
          transition: 'color 0.15s ease',
        }}
      >
        ✕
      </button>
    </div>
  );
};
