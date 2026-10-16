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
  'disconnected' | 'requesting_permission' | 'waiting_rival' | 'connecting' | 'connected' | 'error';

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
    // Google Public Global STUN (verified zero-failure)
    { urls: 'stun:stun.l.google.com:19302' },
  ],
};

// Tune SDP to enforce mono, forward error correction (FEC), 32 kbps cap, and 10ms packetization without corrupting other codecs
export function tuneOpusSDP(sdp: string, targetBitrateBps: number = 32000): string {
  if (!sdp || !sdp.includes('opus')) return sdp;

  const opusMatch = sdp.match(/a=rtpmap:(\d+)\s+opus\/48000/i);
  if (!opusMatch || !opusMatch[1]) return sdp;

  const opusPt = opusMatch[1];
  const fmtpRegex = new RegExp(`(a=fmtp:${opusPt}\\s+)([^\\r\\n]*)`, 'i');

  if (fmtpRegex.test(sdp)) {
    return sdp.replace(fmtpRegex, (_match, prefix, params) => {
      const paramMap = new Map<string, string>();
      params.split(';').forEach((p: string) => {
        const parts = p.trim().split('=');
        if (parts[0]) paramMap.set(parts[0].toLowerCase(), parts[1] || '');
      });
      paramMap.set('stereo', '0');
      paramMap.set('sprop-stereo', '0');
      paramMap.set('maxaveragebitrate', String(targetBitrateBps));
      paramMap.set('cbr', '0');
      paramMap.set('useinbandfec', '1');
      paramMap.set('minptime', '10');

      const newParams = Array.from(paramMap.entries())
        .map(([k, v]) => (v ? `${k}=${v}` : k))
        .join(';');
      return `${prefix}${newParams}`;
    });
  } else {
    const rtpmapRegex = new RegExp(
      `(a=rtpmap:${opusPt}\\s+opus\\/48000\\/[^\\r\\n]+(?:\\r?\\n))`,
      'i'
    );
    return sdp.replace(
      rtpmapRegex,
      `$1a=fmtp:${opusPt} stereo=0;sprop-stereo=0;maxaveragebitrate=${targetBitrateBps};cbr=0;useinbandfec=1;minptime=10\r\n`
    );
  }
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
    el.style.position = 'absolute';
    el.style.width = '1px';
    el.style.height = '1px';
    el.style.overflow = 'hidden';
    el.style.clip = 'rect(0 0 0 0)';
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
  const pendingOfferRef = useRef<{ from: string; desc: RTCSessionDescriptionInit } | null>(null);
  const isJoinedRef = useRef<boolean>(false);
  const isDeafenedRef = useRef<boolean>(false);
  const isNegotiatingRef = useRef<boolean>(false);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectingWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
            console.info(
              '[VoiceChat] Loaded dynamic ICE servers (Cloudflare Realtime TURN configured)'
            );
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
    pendingOfferRef.current = null;

    if (connectingWatchdogRef.current) {
      clearTimeout(connectingWatchdogRef.current);
      connectingWatchdogRef.current = null;
    }

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

          // Check remote opponent speaking via standard WebRTC receiver sources
          if (!isDeafenedRef.current && pcRef.current) {
            try {
              const receivers = pcRef.current.getReceivers();
              const audioReceiver = receivers.find(r => r.track && r.track.kind === 'audio');
              if (audioReceiver && typeof audioReceiver.getSynchronizationSources === 'function') {
                const sources = audioReceiver.getSynchronizationSources();
                const firstSource = sources && sources.length > 0 ? sources[0] : undefined;
                if (firstSource && typeof firstSource.audioLevel === 'number') {
                  setIsOpponentSpeaking(firstSource.audioLevel > 0.02);
                } else {
                  setIsOpponentSpeaking(false);
                }
              }
            } catch {
              setIsOpponentSpeaking(false);
            }
          } else {
            setIsOpponentSpeaking(false);
          }
        }, 120);
      }
    } catch (err) {
      console.warn('[VoiceChat] Audio analyser setup notice:', err);
    }
  }, []);

  // Attach remote stream to audio element for native, hardware-accelerated playback
  const attachRemoteStream = useCallback((stream: MediaStream) => {
    console.log(
      '[VoiceChat] Attaching remote audio stream with active tracks:',
      stream.getAudioTracks().length
    );
    remoteStreamRef.current = stream;
    const audio = getOrCreateAudioElement();
    if (audio) {
      audio.srcObject = stream;
      audio.muted = isDeafenedRef.current;
      audio.volume = 1.0;
      playAudioSafely(audio);
    }
  }, []);

  const initiateOfferRef = useRef<((iceRestart?: boolean) => Promise<void>) | null>(null);

  // Reusable helper to get or create the PeerConnection instance without killing in-flight connections
  const getOrCreatePeerConnection = useCallback((): RTCPeerConnection => {
    if (pcRef.current && pcRef.current.signalingState !== 'closed') {
      if (localStreamRef.current) {
        const currentSenders = pcRef.current.getSenders();
        localStreamRef.current.getAudioTracks().forEach(track => {
          const hasSender = currentSenders.some(s => s.track === track);
          if (!hasSender) {
            pcRef.current!.addTrack(track, localStreamRef.current!);
          }
        });
      }
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
      console.log(
        `[VoiceChat] State check: connectionState=${state}, iceConnectionState=${iceState}`
      );

      if (state === 'connected' || iceState === 'connected' || iceState === 'completed') {
        if (disconnectTimerRef.current) {
          clearTimeout(disconnectTimerRef.current);
          disconnectTimerRef.current = null;
        }
        if (connectingWatchdogRef.current) {
          clearTimeout(connectingWatchdogRef.current);
          connectingWatchdogRef.current = null;
        }
        setStatus('connected');
        setError(null);
      } else if (state === 'connecting' || iceState === 'checking') {
        setStatus(prev => (prev === 'connected' ? 'connected' : 'connecting'));
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
                console.warn(
                  '[VoiceChat] Stalled in disconnected state. Triggering ICE restart...'
                );
                if (
                  room &&
                  opponentSessionIdRef.current &&
                  room.sessionId > opponentSessionIdRef.current
                ) {
                  initiateOfferRef.current?.(true);
                }
              }
            }
          }, 4000);
        }
      } else if (state === 'failed' || iceState === 'failed') {
        if (isJoinedRef.current && opponentSessionIdRef.current) {
          setStatus('connecting');
          if (room && room.sessionId && room.sessionId > opponentSessionIdRef.current) {
            initiateOfferRef.current?.(true);
          }
        } else {
          setStatus(isJoinedRef.current ? 'waiting_rival' : 'disconnected');
        }
      }
    };

    pc.onconnectionstatechange = monitorConnectionState;
    pc.oniceconnectionstatechange = monitorConnectionState;

    return pc;
  }, [sendSignal, attachRemoteStream, room]);

  // Deterministic call initiation: called ONLY by the designated initiator
  const initiateOffer = useCallback(
    async (iceRestart: boolean = false) => {
      if (!isJoinedRef.current || !localStreamRef.current || !opponentSessionIdRef.current) {
        return;
      }

      // If already connected and this is not an explicit ICE restart, skip redundant offer
      if (!iceRestart && pcRef.current) {
        const curState = pcRef.current.connectionState;
        const curIce = pcRef.current.iceConnectionState;
        if (curState === 'connected' || curIce === 'connected' || curIce === 'completed') {
          console.log('[VoiceChat] Connection already established, skipping redundant offer');
          return;
        }
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

        console.log(`[VoiceChat] Generating offer (iceRestart=${iceRestart}) as designated caller`);
        const offer = await pc.createOffer({
          iceRestart,
          offerToReceiveAudio: true,
          offerToReceiveVideo: false,
        });

        // Set local description safely with graceful fallback to native SDP
        let sdpToUse = offer.sdp || '';
        try {
          sdpToUse = tuneOpusSDP(offer.sdp || '');
          await pc.setLocalDescription({ type: offer.type, sdp: sdpToUse });
        } catch {
          await pc.setLocalDescription(offer);
          sdpToUse = pc.localDescription?.sdp || offer.sdp || '';
        }

        sendSignal({
          type: 'offer',
          data: { type: offer.type, sdp: sdpToUse },
        });
      } catch (err) {
        console.error('[VoiceChat] Failed to create WebRTC offer:', err);
      } finally {
        setTimeout(() => {
          isNegotiatingRef.current = false;
        }, 500);
      }
    },
    [getOrCreatePeerConnection, sendSignal]
  );

  useEffect(() => {
    initiateOfferRef.current = initiateOffer;
  }, [initiateOffer]);

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
            if (
              room &&
              opponentSessionIdRef.current &&
              room.sessionId > opponentSessionIdRef.current
            ) {
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

  // Handle incoming WebRTC offer from initiator
  const handleIncomingOffer = useCallback(
    async (desc: RTCSessionDescriptionInit, from: string) => {
      try {
        const existingPc = pcRef.current;
        if (existingPc) {
          const curState = existingPc.connectionState;
          const curIce = existingPc.iceConnectionState;
          if (curState === 'connected' || curIce === 'connected' || curIce === 'completed') {
            console.log(
              '[VoiceChat] Incoming renegotiation received while connected; maintaining connected status'
            );
          } else {
            setStatus('connecting');
          }
        } else {
          setStatus('connecting');
        }
        const pc = getOrCreatePeerConnection();

        if (pc.signalingState !== 'stable') {
          console.warn('[VoiceChat] PC not stable for incoming offer:', pc.signalingState);
          try {
            await pc.setLocalDescription({ type: 'rollback' });
          } catch {}
        }

        await pc.setRemoteDescription(new RTCSessionDescription(desc));

        // Drain queued ICE candidates
        while (candidateQueueRef.current.length > 0) {
          const candidate = candidateQueueRef.current.shift();
          if (candidate) {
            await pc.addIceCandidate(candidate).catch(() => {});
          }
        }

        // Create and send answer safely with graceful fallback to native SDP
        const answer = await pc.createAnswer();
        let sdpToUse = answer.sdp || '';
        try {
          sdpToUse = tuneOpusSDP(answer.sdp || '');
          await pc.setLocalDescription({ type: answer.type, sdp: sdpToUse });
        } catch {
          await pc.setLocalDescription(answer);
          sdpToUse = pc.localDescription?.sdp || answer.sdp || '';
        }

        console.log('[VoiceChat] Sending answer to initiator:', from);
        sendSignal({
          type: 'answer',
          data: { type: answer.type, sdp: sdpToUse },
        });
      } catch (err) {
        console.error('[VoiceChat] Responder offer handling error:', err);
      }
    },
    [getOrCreatePeerConnection, sendSignal]
  );

  // Connecting Handshake Watchdog: If stuck in 'connecting' for >6s, trigger recovery
  useEffect(() => {
    if (status === 'connecting') {
      if (connectingWatchdogRef.current) {
        clearTimeout(connectingWatchdogRef.current);
      }
      connectingWatchdogRef.current = setTimeout(() => {
        connectingWatchdogRef.current = null;
        if (isJoinedRef.current) {
          const pc = pcRef.current;
          if (pc) {
            const curState = pc.connectionState;
            const curIce = pc.iceConnectionState;
            if (curState === 'connected' || curIce === 'connected' || curIce === 'completed') {
              console.log(
                '[VoiceChat] Watchdog timer expired but connection is active and connected. Syncing status.'
              );
              setStatus('connected');
              return;
            }
          }

          if (status === 'connecting') {
            console.warn(
              '[VoiceChat] Connecting handshake watchdog expired (6s). Attempting self-healing...'
            );
            if (room && opponentSessionIdRef.current) {
              if (room.sessionId > opponentSessionIdRef.current) {
                initiateOfferRef.current?.(true);
              } else {
                sendSignal({ type: 'ready' });
              }
            }
          }
        }
      }, 6000);
    } else {
      if (connectingWatchdogRef.current) {
        clearTimeout(connectingWatchdogRef.current);
        connectingWatchdogRef.current = null;
      }
    }
    return () => {
      if (connectingWatchdogRef.current) {
        clearTimeout(connectingWatchdogRef.current);
        connectingWatchdogRef.current = null;
      }
    };
  }, [status, room, sendSignal]);

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
      // Pre-unlock audio element inside user click gesture
      const audioEl = getOrCreateAudioElement();
      if (audioEl) {
        audioEl.play().catch(() => {});
      }
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

      // Process pending cached offer from rival if one arrived before mic was granted
      if (pendingOfferRef.current) {
        const cached = pendingOfferRef.current;
        pendingOfferRef.current = null;
        console.log('[VoiceChat] Processing pending offer from initiator:', cached.from);
        await handleIncomingOffer(cached.desc, cached.from);
      } else {
        // Announce readiness to the room
        sendSignal({ type: 'ready' });

        // If opponent is already in voice and we are the designated initiator, start call
        if (opponentSessionIdRef.current && room.sessionId > opponentSessionIdRef.current) {
          const pc = pcRef.current;
          if (pc) {
            const curState = pc.connectionState;
            const curIce = pc.iceConnectionState;
            if (curState === 'connected' || curIce === 'connected' || curIce === 'completed') {
              console.log('[VoiceChat] Already connected, skipping initiateOffer in joinVoice');
              return;
            }
          }
          await initiateOffer(false);
        }
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
  }, [room, setupAudioAnalysers, sendSignal, initiateOffer, handleIncomingOffer, cleanup]);

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

      // Handle active ICE / TURN servers pushed directly from server via WebSocket
      if (signal.type === 'ice_servers' && signal.data) {
        const payload = signal.data as {
          iceServers?: { urls: string | string[]; username?: string; credential?: string }[];
        };
        if (payload.iceServers && payload.iceServers.length > 0) {
          iceServersRef.current = { iceServers: payload.iceServers };
          console.info(
            '[VoiceChat] Received active ICE / TURN servers via Colyseus signaling:',
            payload.iceServers.map(s => s.urls)
          );
          if (pcRef.current && pcRef.current.signalingState !== 'closed') {
            try {
              pcRef.current.setConfiguration({ iceServers: payload.iceServers });
            } catch {}
          }
        }
        return;
      }

      // Track opponent session ID (only from rivals, not server broadcasts)
      if (from !== 'server') {
        opponentSessionIdRef.current = from;
      }

      // 1. Ready presence signal
      if (signal.type === 'ready') {
        console.log('[VoiceChat] Received ready signal from rival:', from);
        setOpponentInVoice(true);

        if (isJoinedRef.current && localStreamRef.current) {
          // If already connected with rival, do not re-negotiate on duplicate ready signals!
          if (pcRef.current) {
            const curState = pcRef.current.connectionState;
            const curIce = pcRef.current.iceConnectionState;
            if (curState === 'connected' || curIce === 'connected' || curIce === 'completed') {
              console.log(
                '[VoiceChat] Already connected with rival, ignoring duplicate ready signal'
              );
              return;
            }
          }

          // Deterministic role: higher sessionId initiates the offer
          if (room.sessionId > from) {
            if (pcRef.current && pcRef.current.signalingState !== 'stable') {
              console.log(
                '[VoiceChat] PeerConnection already negotiating, skipping duplicate offer initiation'
              );
            } else {
              await initiateOffer(false);
            }
          } else {
            setStatus(prev => (prev === 'connected' ? 'connected' : 'connecting'));
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
            console.log('[VoiceChat] Caching offer until local mic is enabled');
            pendingOfferRef.current = { from, desc };
            return;
          }

          await handleIncomingOffer(desc, from);
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
                  await pc.addIceCandidate(candidate).catch(() => {});
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
            await pc.addIceCandidate(candidateData).catch(() => {});
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
  }, [room, getOrCreatePeerConnection, initiateOffer, handleIncomingOffer, sendSignal]);

  // Proactively request active ICE servers from game server on room connect
  useEffect(() => {
    if (!room) return;
    sendSignal({ type: 'ice_servers' });
  }, [room, sendSignal]);

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
