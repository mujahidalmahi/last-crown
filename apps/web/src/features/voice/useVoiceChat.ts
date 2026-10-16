'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Room } from 'colyseus.js';
import {
  BattleRoomState,
  ClientMessageType,
  ServerMessageType,
  VoiceSignalServerMessage,
  VoiceSignalPayload,
} from '@last-crown/shared';

export type VoiceStatus =
  'disconnected' | 'requesting_permission' | 'connecting' | 'connected' | 'error';

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
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
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
    if (activityCheckTimerRef.current) {
      clearInterval(activityCheckTimerRef.current);
      activityCheckTimerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
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

  // Create & wire RTCPeerConnection
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
          setStatus('disconnected');
          setOpponentInVoice(false);
        }
      };

      return pc;
    },
    [sendSignal, isDeafened]
  );

  // Initiate WebRTC offer (called by polite initiator)
  const initiateOffer = useCallback(
    async (pc: RTCPeerConnection) => {
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false,
        });
        await pc.setLocalDescription(offer);
        sendSignal({
          type: 'offer',
          data: offer,
        });
      } catch (err: unknown) {
        console.error('[VoiceChat] Failed to create WebRTC offer:', err);
      }
    },
    [sendSignal]
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

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      localStreamRef.current = stream;
      setIsMuted(!stream.getAudioTracks()[0]?.enabled);
      setupAudioAnalysers(stream);

      // Create Peer Connection
      createPeerConnection(stream);
      setStatus('connecting');

      // Announce ready to opponent in this match instance
      sendSignal({ type: 'ready' as unknown as 'offer' });
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
  }, [room, createPeerConnection, sendSignal, setupAudioAnalysers, cleanup]);

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

      // Opponent announces they are ready to voice chat
      if ((signal.type as string) === 'ready') {
        setOpponentInVoice(true);
        if (pcRef.current && localStreamRef.current) {
          // Tie-break: if our sessionId is alphabetically lower, we initiate the offer
          if (room.sessionId < from) {
            await initiateOffer(pcRef.current);
          }
        }
        return;
      }

      // Received WebRTC Offer
      if (signal.type === 'offer' && signal.data) {
        setOpponentInVoice(true);
        try {
          let pc = pcRef.current;
          if (!pc && localStreamRef.current) {
            pc = createPeerConnection(localStreamRef.current);
          }
          if (pc) {
            await pc.setRemoteDescription(
              new RTCSessionDescription(signal.data as RTCSessionDescriptionInit)
            );

            // Drain queued ICE candidates
            while (candidateQueueRef.current.length > 0) {
              const candidate = candidateQueueRef.current.shift();
              if (candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
              }
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendSignal({
              type: 'answer',
              data: answer,
            });
          }
        } catch (err) {
          console.error('[VoiceChat] Error handling offer:', err);
        }
        return;
      }

      // Received WebRTC Answer
      if (signal.type === 'answer' && signal.data) {
        try {
          if (pcRef.current) {
            await pcRef.current.setRemoteDescription(
              new RTCSessionDescription(signal.data as RTCSessionDescriptionInit)
            );

            // Drain queued ICE candidates
            while (candidateQueueRef.current.length > 0) {
              const candidate = candidateQueueRef.current.shift();
              if (candidate) {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
              }
            }
          }
        } catch (err) {
          console.error('[VoiceChat] Error handling answer:', err);
        }
        return;
      }

      // Received ICE Candidate
      if (signal.type === 'candidate' && signal.data) {
        try {
          const candidateData = signal.data as RTCIceCandidateInit;
          if (pcRef.current && pcRef.current.remoteDescription) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidateData)).catch(() => {});
          } else {
            candidateQueueRef.current.push(candidateData);
          }
        } catch (err) {
          console.error('[VoiceChat] Error handling ICE candidate:', err);
        }
        return;
      }

      // Opponent left or muted
      if (signal.type === 'leave') {
        setOpponentInVoice(false);
        setIsOpponentSpeaking(false);
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = null;
        }
      }
    };

    // Bind Colyseus message listener
    room.onMessage(ServerMessageType.VOICE_SIGNAL, messageHandler);

    return () => {
      // Room listeners in Colyseus are cleaned up on room leave
    };
  }, [room, createPeerConnection, initiateOffer, sendSignal]);

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
    joinVoice,
    leaveVoice,
    toggleMute,
    toggleDeafen,
  };
}
