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
  | 'waiting_rival'
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
  isOpponentMuted: boolean;
  error: string | null;
  remoteAudioRef: MutableRefObject<HTMLAudioElement | null>;
  joinVoice: () => Promise<void>;
  leaveVoice: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
}

export const VOICE_ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    // Cloudflare Public Anycast STUN
    { urls: 'stun:stun.cloudflare.com:3478' },
    // Google Public STUN
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Free Public TURN (Metered Open Relay - handles restrictive NATs, 4G/5G, symmetric firewalls)
    { urls: 'stun:openrelay.metered.ca:80' },
    {
      urls: 'turn:openrelay.metered.ca:80?transport=udp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:80?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

// Tune SDP to enforce mono, forward error correction (FEC), 32 kbps cap, and 10ms packetization
export function tuneOpusSDP(sdp: string, targetBitrateBps: number = 32000): string {
  if (!sdp || !sdp.includes('opus')) return sdp;
  return sdp.replace(
    /(a=fmtp:\d+ .*)/g,
    `$1;stereo=0;sprop-stereo=0;maxaveragebitrate=${targetBitrateBps};cbr=0;useinbandfec=1;minptime=10`
  );
}

function getOrCreateAudioElement(): HTMLAudioElement | null {
  if (typeof document === 'undefined') return null;
  let el = document.getElementById('last-crown-remote-voice-audio') as HTMLAudioElement | null;
  if (!el) {
    el = document.createElement('audio');
    el.id = 'last-crown-remote-voice-audio';
    el.autoplay = true;
    el.volume = 1.0;
    el.setAttribute('playsinline', 'true');
    el.setAttribute('webkit-playsinline', 'true');
    el.style.position = 'fixed';
    el.style.top = '-9999px';
    el.style.left = '-9999px';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    document.body.appendChild(el);
  }
  return el;
}

function playAudioSafely(audio: HTMLAudioElement) {
  audio.play().catch(err => {
    console.warn('[VoiceChat] Audio playback deferred awaiting user interaction:', err);
    const unlock = () => {
      audio.play().catch(() => {});
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('click', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    document.addEventListener('click', unlock, { once: true });
  });
}

export function useVoiceChat({ room, autoJoin = false }: UseVoiceChatOptions = {}): VoiceChatState {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [status, setStatus] = useState<VoiceStatus>('disconnected');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDeafened, setIsDeafened] = useState<boolean>(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState<boolean>(false);
  const [isOpponentSpeaking, setIsOpponentSpeaking] = useState<boolean>(false);
  const [opponentInVoice, setOpponentInVoice] = useState<boolean>(false);
  const [isOpponentMuted, setIsOpponentMuted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const candidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const opponentSessionIdRef = useRef<string | null>(null);
  const isJoinedRef = useRef<boolean>(false);
  const isDeafenedRef = useRef<boolean>(false);
  const isNegotiatingRef = useRef<boolean>(false);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iceServersRef = useRef<RTCConfiguration>(VOICE_ICE_SERVERS);

  // Audio Analysers for voice activity detection
  const audioContextRef = useRef<AudioContext | null>(null);
  const localAnalyserRef = useRef<AnalyserNode | null>(null);
  const remoteAnalyserRef = useRef<AnalyserNode | null>(null);
  const activityCheckTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync isDeafened ref and audio element mute state
  useEffect(() => {
    isDeafenedRef.current = isDeafened;
    const audio = getOrCreateAudioElement();
    if (audio) {
      audio.muted = isDeafened;
    }
  }, [isDeafened]);

  // Check WebRTC browser support and fetch dynamic Cloudflare Realtime TURN credentials
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const supported =
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof window.RTCPeerConnection !== 'undefined';
    setIsSupported(supported);

    // Bind DOM audio element ref
    remoteAudioRef.current = getOrCreateAudioElement();

    // Dynamically retrieve Cloudflare Realtime TURN credentials from API endpoint
    const fetchTurnServers = async () => {
      try {
        const res = await fetch('/api/ice-servers').catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.iceServers) && data.iceServers.length > 0) {
            iceServersRef.current = { iceServers: data.iceServers };
            console.info('[VoiceChat] Loaded dynamic ICE servers (Cloudflare Realtime TURN configured)');
          }
        }
      } catch {}
    };
    fetchTurnServers();
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

  // Teardown helper
  const cleanup = useCallback(() => {
    isJoinedRef.current = false;
    isNegotiatingRef.current = false;

    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }

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
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    const audio = getOrCreateAudioElement();
    if (audio) {
      audio.srcObject = null;
    }
    remoteStreamRef.current = null;

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
    setIsOpponentMuted(false);
  }, []);

  // Initialize Web Audio API Analyser for voice activity detection
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
          if (remoteAnalyserRef.current && !isDeafenedRef.current) {
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

  // Attach remote stream to audio element and remote analyser
  const attachRemoteStream = useCallback((stream: MediaStream) => {
    remoteStreamRef.current = stream;
    const audio = getOrCreateAudioElement();
    if (audio) {
      audio.srcObject = stream;
      audio.muted = isDeafenedRef.current;
      audio.volume = 1.0;
      playAudioSafely(audio);
    }

    try {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        const remoteSource = audioContextRef.current.createMediaStreamSource(stream);
        const remoteAnalyser = audioContextRef.current.createAnalyser();
        remoteAnalyser.fftSize = 256;
        remoteAnalyser.smoothingTimeConstant = 0.3;
        remoteSource.connect(remoteAnalyser);
        remoteAnalyserRef.current = remoteAnalyser;
      }
    } catch (e) {
      console.warn('[VoiceChat] Remote analyser attach notice:', e);
    }
  }, []);

  // Deterministic call initiation: called ONLY by the designated initiator
  const initiateOffer = useCallback(
    async (iceRestart: boolean = false) => {
      if (!isJoinedRef.current || !localStreamRef.current || !opponentSessionIdRef.current) {
        return;
      }

      if (isNegotiatingRef.current && !iceRestart) {
        console.log('[VoiceChat] Offer negotiation already active, skipping duplicate');
        return;
      }

      try {
        isNegotiatingRef.current = true;
        setStatus('connecting');
        const pc = getOrCreatePeerConnection();

        if (pc.signalingState !== 'stable' && !iceRestart) {
          console.log('[VoiceChat] PC not stable for offer generation:', pc.signalingState);
          return;
        }

        console.log(
          `[VoiceChat] Generating offer (iceRestart=${iceRestart}) as designated caller`
        );
        const offer = await pc.createOffer({
          iceRestart,
          offerToReceiveAudio: true,
          offerToReceiveVideo: false,
        });

        // Tune SDP for mono 32kbps Opus with forward error correction
        const tunedSdp = tuneOpusSDP(offer.sdp || '');
        await pc.setLocalDescription({ type: offer.type, sdp: tunedSdp });

        sendSignal({
          type: 'offer',
          data: { type: offer.type, sdp: tunedSdp },
        });
      } catch (err) {
        console.error('[VoiceChat] Failed to create WebRTC offer:', err);
      } finally {
        setTimeout(() => {
          isNegotiatingRef.current = false;
        }, 500);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sendSignal]
  );

  // Reusable helper to get or create the PeerConnection instance without killing in-flight connections
  const getOrCreatePeerConnection = useCallback((): RTCPeerConnection => {
    if (pcRef.current && pcRef.current.signalingState !== 'closed') {
      return pcRef.current;
    }

    console.log('[VoiceChat] Creating new RTCPeerConnection with active ICE servers');
    const pc = new RTCPeerConnection(iceServersRef.current);
    pcRef.current = pc;

    // Add local mic audio track
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Stream ICE candidates to opponent
    pc.onicecandidate = event => {
      if (event.candidate && event.candidate.candidate) {
        sendSignal({
          type: 'candidate',
          data: event.candidate.toJSON(),
        });
      }
    };

    // Receive opponent audio stream (supports both event.streams and fallback to new MediaStream)
    pc.ontrack = event => {
      console.log('[VoiceChat] Remote track received:', event.track.id, event.track.kind);
      const stream =
        event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
      attachRemoteStream(stream);
    };

    // Connection lifecycle monitoring with Safari/iOS disconnected state self-healing
    const monitorConnectionState = () => {
      if (!pcRef.current) return;
      const state = pcRef.current.connectionState;
      const iceState = pcRef.current.iceConnectionState;
      console.log(`[VoiceChat] State check: connectionState=${state}, iceConnectionState=${iceState}`);

      if (state === 'connected' || iceState === 'connected') {
        if (disconnectTimerRef.current) {
          clearTimeout(disconnectTimerRef.current);
          disconnectTimerRef.current = null;
        }
        setStatus('connected');
        setError(null);
      } else if (state === 'connecting' || iceState === 'checking') {
        setStatus('connecting');
      } else if (state === 'disconnected' || iceState === 'disconnected') {
        // Safari/iOS edge case: can get stuck in 'disconnected' without transitioning to 'failed'
        if (!disconnectTimerRef.current) {
          console.warn('[VoiceChat] Disconnected state observed. Arming 4s recovery timer...');
          disconnectTimerRef.current = setTimeout(() => {
            disconnectTimerRef.current = null;
            if (pcRef.current) {
              const curState = pcRef.current.connectionState;
              const curIce = pcRef.current.iceConnectionState;
              if (
                curState === 'disconnected' ||
                curIce === 'disconnected' ||
                curState === 'failed' ||
                curIce === 'failed'
              ) {
                console.warn('[VoiceChat] Stalled in disconnected state. Triggering ICE restart...');
                if (room && opponentSessionIdRef.current && room.sessionId > opponentSessionIdRef.current) {
                  initiateOffer(true);
                }
              }
            }
          }, 4000);
        }
      } else if (state === 'failed' || iceState === 'failed') {
        if (isJoinedRef.current && opponentSessionIdRef.current) {
          setStatus('connecting');
          if (room && room.sessionId && room.sessionId > opponentSessionIdRef.current) {
            initiateOffer(true);
          }
        } else {
          setStatus(isJoinedRef.current ? 'waiting_rival' : 'disconnected');
        }
      }
    };

    pc.onconnectionstatechange = monitorConnectionState;
    pc.oniceconnectionstatechange = monitorConnectionState;

    return pc;
  }, [sendSignal, attachRemoteStream, room, initiateOffer]);

  // Page visibility recovery: detect when user returns to tab and repair stalled connection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'visible' && isJoinedRef.current) {
        const pc = pcRef.current;
        if (pc) {
          const state = pc.connectionState;
          const iceState = pc.iceConnectionState;
          if (state === 'disconnected' || iceState === 'disconnected' || state === 'failed') {
            console.log('[VoiceChat] Tab returned to foreground; repairing stalled connection...');
            if (room && opponentSessionIdRef.current && room.sessionId > opponentSessionIdRef.current) {
              initiateOffer(true);
            }
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [room, initiateOffer]);

  // Join Voice Chat
  const joinVoice = useCallback(async () => {
    if (!room) {
      setError('Cannot join voice: No active room connected');
      return;
    }

    try {
      setStatus('requesting_permission');
      setError(null);

      console.log('[VoiceChat] Requesting microphone permission...');
      // Request microphone access with echo cancellation & noise suppression
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
          channelCount: { ideal: 1 },
          sampleRate: { ideal: 48000 },
        },
        video: false,
      });

      console.log('[VoiceChat] Microphone granted, active tracks:', stream.getAudioTracks().length);
      localStreamRef.current = stream;
      isJoinedRef.current = true;
      setIsMuted(!stream.getAudioTracks()[0]?.enabled);

      setupAudioAnalysers(stream);

      // Check if opponent is already in voice
      if (opponentSessionIdRef.current) {
        setStatus('connecting');
      } else {
        setStatus('waiting_rival');
      }

      // Announce readiness to the room
      sendSignal({ type: 'ready' });

      // If opponent is already in voice and we are the designated initiator, start call
      if (opponentSessionIdRef.current && room.sessionId > opponentSessionIdRef.current) {
        await initiateOffer(false);
      }
    } catch (err: unknown) {
      let errorMsg = 'Failed to access microphone';
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMsg = 'Microphone permission denied. Allow microphone access in your browser.';
        } else if (err.name === 'NotFoundError') {
          errorMsg = 'No microphone device found on your system.';
        } else {
          errorMsg = err.message;
        }
      }
      console.error('[VoiceChat] Microphone error:', errorMsg);
      setError(errorMsg);
      setStatus('error');
      cleanup();
    }
  }, [room, setupAudioAnalysers, sendSignal, initiateOffer, cleanup]);

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
      const audio = getOrCreateAudioElement();
      if (audio) {
        audio.muted = next;
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

      // Track opponent session ID
      opponentSessionIdRef.current = from;

      // 1. Ready presence signal
      if (signal.type === 'ready') {
        console.log('[VoiceChat] Received ready signal from rival:', from);
        setOpponentInVoice(true);

        if (isJoinedRef.current && localStreamRef.current) {
          // Deterministic role: higher sessionId initiates the offer
          if (room.sessionId > from) {
            await initiateOffer(false);
          } else {
            setStatus('connecting');
          }
        }
        return;
      }

      // 2. Incoming Offer (Responder handles offer)
      if ((signal.type === 'offer' || signal.type === 'description') && signal.data) {
        setOpponentInVoice(true);
        const desc = signal.data as RTCSessionDescriptionInit;

        if (desc.type === 'offer') {
          console.log('[VoiceChat] Received offer from initiator:', from);
          if (!isJoinedRef.current || !localStreamRef.current) {
            console.log('[VoiceChat] Received offer but local user is not yet in voice');
            return;
          }

          try {
            setStatus('connecting');
            const pc = getOrCreatePeerConnection();
            await pc.setRemoteDescription(new RTCSessionDescription(desc));

            // Drain queued ICE candidates
            while (candidateQueueRef.current.length > 0) {
              const candidate = candidateQueueRef.current.shift();
              if (candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
              }
            }

            // Create and send answer with tuned Opus SDP
            const answer = await pc.createAnswer();
            const tunedSdp = tuneOpusSDP(answer.sdp || '');
            await pc.setLocalDescription({ type: answer.type, sdp: tunedSdp });

            console.log('[VoiceChat] Sending tuned Opus answer to initiator');
            sendSignal({
              type: 'answer',
              data: { type: answer.type, sdp: tunedSdp },
            });
          } catch (err) {
            console.error('[VoiceChat] Responder offer handling error:', err);
          }
          return;
        }

        // 3. Incoming Answer (Initiator handles answer)
        if (desc.type === 'answer') {
          console.log('[VoiceChat] Received answer from responder:', from);
          const pc = pcRef.current;
          if (pc && pc.signalingState === 'have-local-offer') {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(desc));

              // Drain queued ICE candidates
              while (candidateQueueRef.current.length > 0) {
                const candidate = candidateQueueRef.current.shift();
                if (candidate) {
                  await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
                }
              }
            } catch (err) {
              console.error('[VoiceChat] Initiator answer handling error:', err);
            }
          }
          return;
        }
      }

      // 4. Incoming ICE Candidate
      if (signal.type === 'candidate' && signal.data) {
        try {
          const candidateData = signal.data as RTCIceCandidateInit;
          if (!candidateData || !candidateData.candidate) return;

          const pc = pcRef.current;
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(candidateData)).catch(() => {});
          } else {
            candidateQueueRef.current.push(candidateData);
          }
        } catch (err) {
          console.error('[VoiceChat] ICE candidate handling error:', err);
        }
        return;
      }

      // 5. Opponent Mute Status Signal
      if (signal.type === 'mute' && signal.data) {
        const data = signal.data as { isMuted?: boolean };
        setIsOpponentMuted(!!data.isMuted);
        return;
      }

      // 6. Opponent Left Voice
      if (signal.type === 'leave') {
        console.log('[VoiceChat] Rival left voice chat');
        setOpponentInVoice(false);
        setIsOpponentSpeaking(false);
        setIsOpponentMuted(false);
        opponentSessionIdRef.current = null;

        const audio = getOrCreateAudioElement();
        if (audio) {
          audio.srcObject = null;
        }
        remoteStreamRef.current = null;

        if (pcRef.current) {
          pcRef.current.close();
          pcRef.current = null;
        }

        if (isJoinedRef.current) {
          setStatus('waiting_rival');
        }
        return;
      }
    };

    // Bind Colyseus message listener and capture unsubscribe function
    const unsubscribe = room.onMessage(ServerMessageType.VOICE_SIGNAL, messageHandler);

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [room, getOrCreatePeerConnection, initiateOffer, sendSignal]);

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
    isOpponentMuted,
    error,
    remoteAudioRef,
    joinVoice,
    leaveVoice,
    toggleMute,
    toggleDeafen,
  };
}
