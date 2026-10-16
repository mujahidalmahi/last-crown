'use client';

import { useState, useEffect, useRef, useCallback, MutableRefObject } from 'react';
import { Room } from 'colyseus.js';
import {
  BattleRoomState,
  ClientMessageType,
  ServerMessageType,
  VoiceSignalServerMessage,
  VoiceSignalPayload,
} from '@last-crown/shared';

export type VoiceStatus =
  | 'disconnected'
  | 'requesting_permission'
  | 'connecting'
  | 'connected'
  | 'error';

export interface UseVoiceChatOptions {
  room?: Room<BattleRoomState> | null;
  autoJoin?: boolean;
}

export interface VoiceChatState {
  isSupported: boolean;
  status: VoiceStatus;
  isMuted: boolean;
  isDeafened: boolean;
  isUserSpeaking: boolean;
  isOpponentSpeaking: boolean;
  opponentInVoice: boolean;
  error: string | null;
  remoteAudioRef: MutableRefObject<HTMLAudioElement | null>;
  joinVoice: () => Promise<void>;
  leaveVoice: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
  iceCandidatePoolSize: 10,
};

export function useVoiceChat({ room, autoJoin = false }: UseVoiceChatOptions = {}): VoiceChatState {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [status, setStatus] = useState<VoiceStatus>('disconnected');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDeafened, setIsDeafened] = useState<boolean>(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState<boolean>(false);
  const [isOpponentSpeaking, setIsOpponentSpeaking] = useState<boolean>(false);
  const [opponentInVoice, setOpponentInVoice] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const candidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const opponentSessionIdRef = useRef<string | null>(null);
  const makingOfferRef = useRef<boolean>(false);
  const ignoreOfferRef = useRef<boolean>(false);
  const isJoinedRef = useRef<boolean>(false);

  // Audio Analysers for voice activity detection
  const audioContextRef = useRef<AudioContext | null>(null);
  const localAnalyserRef = useRef<AnalyserNode | null>(null);
  const remoteAnalyserRef = useRef<AnalyserNode | null>(null);
  const activityCheckTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check WebRTC browser support on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const supported =
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof window.RTCPeerConnection !== 'undefined';
    setIsSupported(supported);
  }, []);

  // Cleanup helper
  const cleanup = useCallback(() => {
    isJoinedRef.current = false;

    if (activityCheckTimerRef.current) {
      clearInterval(activityCheckTimerRef.current);
      activityCheckTimerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {}
      });
      localStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onnegotiationneeded = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    localAnalyserRef.current = null;
    remoteAnalyserRef.current = null;
    candidateQueueRef.current = [];
    opponentSessionIdRef.current = null;
    makingOfferRef.current = false;
    ignoreOfferRef.current = false;

    setIsUserSpeaking(false);
    setIsOpponentSpeaking(false);
    setOpponentInVoice(false);
  }, []);

  // Send signaling message strictly to the opponent in this match instance
  const sendSignal = useCallback(
    (signal: VoiceSignalPayload) => {
      if (room && room.sessionId) {
        room.send(ClientMessageType.VOICE_SIGNAL, { signal });
      }
    },
    [room]
  );

  // Helper to ensure audio playback is unblocked by user gestures
  const ensureAudioPlayback = useCallback(() => {
    if (remoteAudioRef.current && remoteAudioRef.current.srcObject) {
      remoteAudioRef.current.play().catch(() => {});
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }
  }, []);

  // Initialize Web Audio API Analyser for speech detection
  const setupAudioAnalysers = useCallback((localStream: MediaStream) => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = audioContextRef.current || new AudioContextClass();
      audioContextRef.current = ctx;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // Local mic analyser
      const localSource = ctx.createMediaStreamSource(localStream);
      const localAnalyser = ctx.createAnalyser();
      localAnalyser.fftSize = 256;
      localAnalyser.smoothingTimeConstant = 0.3;
      localSource.connect(localAnalyser);
      localAnalyserRef.current = localAnalyser;

      // Start polling speech volume
      if (!activityCheckTimerRef.current) {
        const localData = new Uint8Array(localAnalyser.frequencyBinCount);
        activityCheckTimerRef.current = setInterval(() => {
          // Check local speaking
          if (localAnalyserRef.current && localStreamRef.current?.getAudioTracks()[0]?.enabled) {
            localAnalyserRef.current.getByteFrequencyData(localData);
            const sum = localData.reduce((acc, v) => acc + v, 0);
            const avg = sum / localData.length;
            setIsUserSpeaking(avg > 14);
          } else {
            setIsUserSpeaking(false);
          }

          // Check remote opponent speaking
          if (remoteAnalyserRef.current) {
            const remoteData = new Uint8Array(remoteAnalyserRef.current.frequencyBinCount);
            remoteAnalyserRef.current.getByteFrequencyData(remoteData);
            const sum = remoteData.reduce((acc, v) => acc + v, 0);
            const avg = sum / remoteData.length;
            setIsOpponentSpeaking(avg > 14);
          } else {
            setIsOpponentSpeaking(false);
          }
        }, 120);
      }
    } catch (err) {
      console.warn('[VoiceChat] Audio analyser setup notice:', err);
    }
  }, []);

  // Create & wire RTCPeerConnection with W3C Perfect Negotiation
  const createPeerConnection = useCallback(
    (localStream: MediaStream): RTCPeerConnection => {
      if (pcRef.current) {
        pcRef.current.close();
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      // Add local audio tracks to peer connection
      localStream.getAudioTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });

      // Stream incoming ICE candidates to opponent
      pc.onicecandidate = event => {
        if (event.candidate) {
          sendSignal({
            type: 'candidate',
            data: event.candidate.toJSON(),
          });
        }
      };

      // Perfect Negotiation: onnegotiationneeded handles offer creation automatically
      pc.onnegotiationneeded = async () => {
        try {
          makingOfferRef.current = true;
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: false,
          });
          if (pc.signalingState !== 'stable') return;
          await pc.setLocalDescription(offer);
          sendSignal({
            type: 'description',
            data: pc.localDescription,
          });
        } catch (err) {
          console.error('[VoiceChat] Negotiation offer error:', err);
        } finally {
          makingOfferRef.current = false;
        }
      };

      // Handle receiving opponent audio stream
      pc.ontrack = event => {
        if (event.streams && event.streams[0]) {
          const stream = event.streams[0];
          setOpponentInVoice(true);

          if (!remoteAudioRef.current) {
            const audio = new Audio();
            audio.autoplay = true;
            remoteAudioRef.current = audio;
          }

          remoteAudioRef.current.srcObject = stream;
          remoteAudioRef.current.muted = isDeafened;
          remoteAudioRef.current.play().catch(e => {
            console.warn('[VoiceChat] Autoplay restricted until user interaction:', e);
            // Resume on next user interaction
            const resumeHandler = () => {
              ensureAudioPlayback();
              window.removeEventListener('pointerdown', resumeHandler);
              window.removeEventListener('keydown', resumeHandler);
            };
            window.addEventListener('pointerdown', resumeHandler, { once: true });
            window.addEventListener('keydown', resumeHandler, { once: true });
          });

          // Setup remote analyser
          try {
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
              const remoteSource = audioContextRef.current.createMediaStreamSource(stream);
              const remoteAnalyser = audioContextRef.current.createAnalyser();
              remoteAnalyser.fftSize = 256;
              remoteAnalyser.smoothingTimeConstant = 0.3;
              remoteSource.connect(remoteAnalyser);
              remoteAnalyserRef.current = remoteAnalyser;
            }
          } catch {}
        }
      };

      pc.onconnectionstatechange = () => {
        if (!pcRef.current) return;
        const state = pcRef.current.connectionState;
        if (state === 'connected') {
          setStatus('connected');
          setError(null);
        } else if (state === 'connecting') {
          setStatus('connecting');
        } else if (state === 'failed' || state === 'closed') {
          if (isJoinedRef.current) {
            setStatus('connecting');
          } else {
            setStatus('disconnected');
          }
          setOpponentInVoice(false);
        }
      };

      return pc;
    },
    [sendSignal, isDeafened, ensureAudioPlayback]
  );

  // Join Voice Chat
  const joinVoice = useCallback(async () => {
    if (!room) {
      setError('Cannot join voice: No active room connected');
      return;
    }

    try {
      setStatus('requesting_permission');
      setError(null);

      // Request microphone access with echo cancellation & noise suppression
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
        video: false,
      });

      localStreamRef.current = stream;
      isJoinedRef.current = true;
      setIsMuted(!stream.getAudioTracks()[0]?.enabled);
      setupAudioAnalysers(stream);

      // Create Peer Connection
      createPeerConnection(stream);
      setStatus('connecting');

      // Ensure any existing audio contexts are resumed on user click
      ensureAudioPlayback();

      // Announce ready presence to opponent in this match instance
      sendSignal({ type: 'ready' });

      // If opponent is already in voice and we know their session, initiate offer directly if negotiationneeded hasn't
      if (opponentSessionIdRef.current) {
        setOpponentInVoice(true);
      }
    } catch (err: unknown) {
      let errorMsg = 'Failed to access microphone';
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMsg = 'Microphone permission denied. Enable microphone access in your browser.';
        } else if (err.name === 'NotFoundError') {
          errorMsg = 'No microphone device found on your system.';
        } else {
          errorMsg = err.message;
        }
      }
      setError(errorMsg);
      setStatus('error');
      cleanup();
    }
  }, [room, createPeerConnection, sendSignal, setupAudioAnalysers, ensureAudioPlayback, cleanup]);

  // Leave Voice Chat
  const leaveVoice = useCallback(() => {
    sendSignal({ type: 'leave' });
    cleanup();
    setStatus('disconnected');
    setError(null);
  }, [sendSignal, cleanup]);

  // Toggle Microphone Mute
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const track = localStreamRef.current.getAudioTracks()[0];
    if (track) {
      const nextState = !track.enabled;
      track.enabled = nextState;
      setIsMuted(!nextState);
      sendSignal({
        type: 'mute',
        data: { isMuted: !nextState },
      });
    }
  }, [sendSignal]);

  // Toggle Deafening (Mute Opponent Audio)
  const toggleDeafen = useCallback(() => {
    setIsDeafened(prev => {
      const next = !prev;
      if (remoteAudioRef.current) {
        remoteAudioRef.current.muted = next;
      }
      return next;
    });
  }, []);

  // Listen to Colyseus Voice Signaling messages
  useEffect(() => {
    if (!room) return;

    const messageHandler = async (message: VoiceSignalServerMessage) => {
      if (!message || !message.signal) return;
      const { signal, from } = message;
      opponentSessionIdRef.current = from;

      // Opponent is in voice
      if (signal.type === 'ready') {
        setOpponentInVoice(true);
        // If we are already joined in voice, respond with ready so opponent knows we are in voice too
        if (isJoinedRef.current && localStreamRef.current) {
          sendSignal({ type: 'ready' });

          // If our peer connection is idle, trigger renegotiation
          const pc = pcRef.current;
          if (pc && pc.signalingState === 'stable') {
            try {
              makingOfferRef.current = true;
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              sendSignal({
                type: 'description',
                data: pc.localDescription,
              });
            } catch (err) {
              console.error('[VoiceChat] Ready handshake offer error:', err);
            } finally {
              makingOfferRef.current = false;
            }
          }
        }
        return;
      }

      // WebRTC Description (Offer or Answer) - Perfect Negotiation
      if (
        (signal.type === 'description' || signal.type === 'offer' || signal.type === 'answer') &&
        signal.data
      ) {
        setOpponentInVoice(true);
        try {
          let pc = pcRef.current;
          if (!pc && localStreamRef.current) {
            pc = createPeerConnection(localStreamRef.current);
          }
          if (!pc) return;

          const desc = signal.data as RTCSessionDescriptionInit;
          const isOffer = desc.type === 'offer';

          // Politeness tie-break: peer with lexicographically higher sessionId is polite
          const isPolite = room.sessionId > from;
          const offerCollision = isOffer && (makingOfferRef.current || pc.signalingState !== 'stable');
          ignoreOfferRef.current = !isPolite && offerCollision;

          if (ignoreOfferRef.current) {
            console.log('[VoiceChat] Impolite peer ignoring colliding offer');
            return;
          }

          if (offerCollision) {
            await Promise.all([
              pc.setLocalDescription({ type: 'rollback' }),
              pc.setRemoteDescription(new RTCSessionDescription(desc)),
            ]);
          } else {
            await pc.setRemoteDescription(new RTCSessionDescription(desc));
          }

          // Drain queued ICE candidates
          while (candidateQueueRef.current.length > 0) {
            const candidate = candidateQueueRef.current.shift();
            if (candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
            }
          }

          if (isOffer) {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendSignal({
              type: 'description',
              data: pc.localDescription,
            });
          }
        } catch (err) {
          console.error('[VoiceChat] Description exchange error:', err);
        }
        return;
      }

      // Received ICE Candidate
      if (signal.type === 'candidate' && signal.data) {
        try {
          const candidateData = signal.data as RTCIceCandidateInit;
          const pc = pcRef.current;
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(candidateData)).catch(() => {});
          } else {
            candidateQueueRef.current.push(candidateData);
          }
        } catch (err) {
          if (!ignoreOfferRef.current) {
            console.error('[VoiceChat] Error adding ICE candidate:', err);
          }
        }
        return;
      }

      // Opponent left voice chat
      if (signal.type === 'leave') {
        setOpponentInVoice(false);
        setIsOpponentSpeaking(false);
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = null;
        }
        if (pcRef.current) {
          pcRef.current.close();
          pcRef.current = null;
        }
        if (isJoinedRef.current && localStreamRef.current) {
          // Re-create peer connection to be ready for opponent return or rematch
          createPeerConnection(localStreamRef.current);
        }
      }
    };

    // Bind Colyseus message listener
    room.onMessage(ServerMessageType.VOICE_SIGNAL, messageHandler);

    return () => {
      // Room listeners in Colyseus
    };
  }, [room, createPeerConnection, sendSignal]);

  // Auto-join if requested
  useEffect(() => {
    if (autoJoin && room && status === 'disconnected' && !error) {
      joinVoice();
    }
  }, [autoJoin, room, status, error, joinVoice]);

  // Teardown on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
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
  };
}
