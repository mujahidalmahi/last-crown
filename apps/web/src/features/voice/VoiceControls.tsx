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
    error,
    remoteAudioRef,
    joinVoice,
    leaveVoice,
    toggleMute,
    toggleDeafen,
  } = voice;

  if (!isSupported) {
    return null;
  }

  // Not connected state
  if (status === 'disconnected') {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', pointerEvents: 'auto' }}>
        <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
        <button
          type="button"
          onClick={joinVoice}
          title="Enable free peer-to-peer voice chat with your opponent"
          style={{
            backgroundColor: 'rgba(10, 14, 22, 0.82)',
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

  // Requesting permissions or connecting state
  if (status === 'requesting_permission' || status === 'connecting') {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'rgba(10, 14, 22, 0.88)',
          border: '1px solid rgba(241, 196, 15, 0.5)',
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
        <span>
          {status === 'requesting_permission' ? 'Grant Mic Access...' : 'Connecting P2P Voice...'}
        </span>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'rgba(50, 10, 10, 0.9)',
          border: '1px solid #ef4444',
          borderRadius: '6px',
          padding: '6px 12px',
          color: '#fca5a5',
          fontSize: '0.78rem',
          pointerEvents: 'auto',
          maxWidth: '320px',
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

  // Connected state: Full Voice Bar
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: 'rgba(10, 14, 22, 0.92)',
        border: '1px solid rgba(212, 175, 55, 0.4)',
        borderRadius: '8px',
        padding: '4px 8px',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.7)',
        pointerEvents: 'auto',
      }}
    >
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
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

      {/* Opponent Connection Indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '2px 8px',
          fontSize: '0.74rem',
          color: opponentInVoice ? '#34d399' : '#94a3b8',
        }}
        title={
          opponentInVoice ? 'Opponent is connected in voice' : 'Opponent has not enabled voice yet'
        }
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: opponentInVoice ? '#10b981' : '#64748b',
            boxShadow: opponentInVoice ? '0 0 6px #10b981' : 'none',
          }}
        />
        <span>{opponentInVoice ? 'Rival Live' : 'Waiting Rival'}</span>
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
