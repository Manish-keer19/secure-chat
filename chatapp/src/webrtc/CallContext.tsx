// ═══════════════════════════════════════════════════════════════════
//  Whisper Chat Frontend — Call Context
//  Provides global call state management, triggers WebRTC connections,
//  synthesizes call audio tones, and handles signaling handlers.
// ═══════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { getSocket } from "../hooks/useSocket";
import { MediaManager } from "./MediaManager";
import { PeerManager } from "./PeerManager";
import type { CallState, CallParticipant } from "./CallTypes";

// ── Audio Tone Synthesizer ──────────────────────────────────────────
class ToneGenerator {
  private ctx: AudioContext | null = null;
  private interval: any = null;

  startDialtone() {
    this.stop();
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playPulse = () => {
        if (!this.ctx || this.ctx.state === "closed") return;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc1.frequency.setValueAtTime(350, this.ctx.currentTime);
        osc2.frequency.setValueAtTime(440, this.ctx.currentTime);

        gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.05, this.ctx.currentTime + 1.5);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.8);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(this.ctx.currentTime + 1.8);
        osc2.stop(this.ctx.currentTime + 1.8);
      };

      playPulse();
      this.interval = setInterval(playPulse, 3000);
    } catch (e) {
      console.warn("Failed to start dialtone:", e);
    }
  }

  startRingtone() {
    this.stop();
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playPulse = () => {
        if (!this.ctx || this.ctx.state === "closed") return;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc1.frequency.setValueAtTime(480, this.ctx.currentTime);
        osc2.frequency.setValueAtTime(620, this.ctx.currentTime);

        gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.08, this.ctx.currentTime + 1.0);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.3);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(this.ctx.currentTime + 1.3);
        osc2.stop(this.ctx.currentTime + 1.3);
      };

      playPulse();
      this.interval = setInterval(playPulse, 2000);
    } catch (e) {
      console.warn("Failed to start ringtone:", e);
    }
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {}
      this.ctx = null;
    }
  }

  playCallEnd() {
    this.stop();
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      gainNode.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch (e) {
      console.warn("Failed to play call end tone:", e);
    }
  }
}

// ── Call Context API ──────────────────────────────────────────────
interface CallContextProps {
  callState: CallState | null;
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  audioEnabled: boolean;
  videoEnabled: boolean;
  cameraFacing: "user" | "environment";
  isSharingScreen: boolean;
  
  // Call status
  isInCall: boolean;
  incomingCall: boolean;
  outgoingCall: boolean;
  isConnecting: boolean;
  error: string | null;
  callFeedback: { type: "ended" | "left" | "declined" | "timeout" | "disconnected"; username?: string } | null;

  // Actions
  startCall: (type: "audio" | "video") => Promise<void>;
  joinCall: () => Promise<void>;
  leaveCall: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  switchCamera: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  clearError: () => void;
}

const CallContext = createContext<CallContextProps | undefined>(undefined);

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [callState, setCallState] = useState<CallState | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");
  const [isSharingScreen, setIsSharingScreen] = useState(false);

  // Connection states
  const [incomingCall, setIncomingCall] = useState(false);
  const [outgoingCall, setOutgoingCall] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callFeedback, setCallFeedback] = useState<{ type: "ended" | "left" | "declined" | "timeout" | "disconnected"; username?: string } | null>(null);

  // Managers
  const mediaManagerRef = useRef<MediaManager | null>(null);
  const peerManagerRef = useRef<PeerManager | null>(null);
  const toneGeneratorRef = useRef<ToneGenerator>(new ToneGenerator());

  // References to keep callbacks updated
  const localStreamRef = useRef<MediaStream | null>(null);
  localStreamRef.current = localStream;

  const getMediaManager = useCallback(() => {
    if (!mediaManagerRef.current) {
      mediaManagerRef.current = new MediaManager();
    }
    return mediaManagerRef.current;
  }, []);

  const clearError = useCallback(() => setError(null), []);

  /**
   * Reset local state variables
   */
  const resetLocalCallState = useCallback(() => {
    toneGeneratorRef.current.stop();
    
    if (mediaManagerRef.current) {
      mediaManagerRef.current.stopAllTracks();
    }
    if (peerManagerRef.current) {
      peerManagerRef.current.cleanupAll();
      peerManagerRef.current = null;
    }

    setLocalStream(null);
    setRemoteStreams({});
    setAudioEnabled(true);
    setVideoEnabled(true);
    setCameraFacing("user");
    setIsSharingScreen(false);
    setIncomingCall(false);
    setOutgoingCall(false);
    setIsInCall(false);
    setIsConnecting(false);
  }, []);

  /**
   * Leave Call Handler
   */
  const leaveCall = useCallback(() => {
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit("leave-call");
    }
    resetLocalCallState();
  }, [resetLocalCallState]);

  /**
   * ICE Candidate from Peer Connection ➔ Send to Peer via Signaling
   */
  const handleIceCandidate = useCallback((targetSocketId: string, candidate: RTCIceCandidate) => {
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit("ice-candidate", { toSocketId: targetSocketId, candidate });
    }
  }, []);

  /**
   * Remote Track added from Peer Connection ➔ Add to remote streams state
   */
  const handleRemoteTrack = useCallback((targetSocketId: string, stream: MediaStream) => {
    setRemoteStreams((prev) => ({
      ...prev,
      [targetSocketId]: stream,
    }));
  }, []);

  /**
   * Initialize PeerManager singleton for this call session
   */
  const initPeerManager = useCallback(() => {
    if (!peerManagerRef.current) {
      peerManagerRef.current = new PeerManager(handleIceCandidate, handleRemoteTrack);
    }
    return peerManagerRef.current;
  }, [handleIceCandidate, handleRemoteTrack]);

  /**
   * Start Call action
   */
  const startCall = useCallback(async (type: "audio" | "video") => {
    setError(null);
    setCallFeedback(null);
    setIsConnecting(true);
    resetLocalCallState();

    try {
      const mm = getMediaManager();
      const stream = await mm.getStream(type, "user");
      setLocalStream(stream);
      setAudioEnabled(true);
      setVideoEnabled(type === "video");
      setCameraFacing("user");

      const socket = getSocket();
      if (!socket || !socket.connected) {
        throw new Error("Chat server disconnected. Please rejoin the room.");
      }

      socket.emit("start-call", { callType: type });
      setOutgoingCall(true);
      toneGeneratorRef.current.startDialtone();
    } catch (err: any) {
      console.error("Failed to start call:", err);
      setError(err?.message || "Could not access media devices");
      resetLocalCallState();
    } finally {
      setIsConnecting(false);
    }
  }, [getMediaManager, resetLocalCallState]);

  /**
   * Join/Accept Call action
   */
  const joinCall = useCallback(async () => {
    if (!callState) return;
    setError(null);
    setCallFeedback(null);
    setIsConnecting(true);
    setIncomingCall(false);
    toneGeneratorRef.current.stop();

    try {
      const mm = getMediaManager();
      const stream = await mm.getStream(callState.callType, "user");
      setLocalStream(stream);
      setAudioEnabled(true);
      setVideoEnabled(callState.callType === "video");
      setCameraFacing("user");

      initPeerManager();

      const socket = getSocket();
      if (!socket || !socket.connected) {
        throw new Error("Chat server disconnected");
      }

      socket.emit("join-call");
      setIsInCall(true);
    } catch (err: any) {
      console.error("Failed to accept call:", err);
      setError(err?.message || "Could not access media devices");
      resetLocalCallState();
    } finally {
      setIsConnecting(false);
    }
  }, [callState, getMediaManager, initPeerManager, resetLocalCallState]);

  /**
   * Toggle Audio control
   */
  const toggleAudio = useCallback(() => {
    const mm = getMediaManager();
    const nextState = !audioEnabled;
    mm.setAudioEnabled(nextState);
    setAudioEnabled(nextState);

    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit("toggle-media", { audio: nextState, video: videoEnabled });
    }
  }, [audioEnabled, videoEnabled, getMediaManager]);

  /**
   * Toggle Video control
   */
  const toggleVideo = useCallback(() => {
    const mm = getMediaManager();
    const nextState = !videoEnabled;
    mm.setVideoEnabled(nextState);
    setVideoEnabled(nextState);

    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit("toggle-media", { audio: audioEnabled, video: nextState });
    }
  }, [audioEnabled, videoEnabled, getMediaManager]);

  /**
   * Switch Mobile Camera
   */
  const switchCamera = useCallback(async () => {
    if (!localStream || !callState) return;
    try {
      const mm = getMediaManager();
      const { newTrack } = await mm.switchCamera(callState.callType);
      setCameraFacing(mm.getCameraFacing());

      // Replace track on all active peer connections
      if (peerManagerRef.current) {
        await peerManagerRef.current.replaceVideoTrack(newTrack);
      }
    } catch (err: any) {
      console.error("Failed to switch camera:", err);
      setError(err?.message || "Failed to switch camera device");
    }
  }, [localStream, callState, getMediaManager]);

  /**
   * Toggle Screen Share on desktop
   */
  const toggleScreenShare = useCallback(async () => {
    if (!localStream || !callState) return;
    try {
      const mm = getMediaManager();
      if (!isSharingScreen) {
        const { track } = await mm.startScreenShare();
        setIsSharingScreen(true);
        if (peerManagerRef.current) {
          await peerManagerRef.current.replaceVideoTrack(track);
        }
      } else {
        const { newTrack } = await mm.stopScreenShare();
        setIsSharingScreen(false);
        if (peerManagerRef.current) {
          await peerManagerRef.current.replaceVideoTrack(newTrack);
        }
      }
    } catch (err: any) {
      console.error("Failed to toggle screen share:", err);
      setError(err?.message || "Failed to toggle screen share");
    }
  }, [localStream, callState, isSharingScreen, getMediaManager]);

  // ── Setup Socket Signaling Listeners ──────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    const onCallState = (state: CallState | null) => {
      setCallState(state);
      if (!state) {
        // Call ended or destroyed
        resetLocalCallState();
        return;
      }

      // Check if we are a participant in this call
      const selfParticipant = state.participants.find((p) => p.socketId === socket.id);

      if (selfParticipant) {
        if (state.participants.length === 1 && !state.hasBeenAnswered) {
          // We are the initiator and call is unanswered, waiting for recipient
          setIsInCall(false);
          setOutgoingCall(true);
          setIncomingCall(false);
          toneGeneratorRef.current.startDialtone();
        } else {
          // Connected active call
          setIsInCall(true);
          setOutgoingCall(false);
          setIncomingCall(false);
          toneGeneratorRef.current.stop();
        }
      } else {
        // A call exists, but we are not in it ➔ Trigger incoming alert
        setIsInCall(false);
        setOutgoingCall(false);
        setIncomingCall(true);
        toneGeneratorRef.current.startRingtone();
      }
    };

    const onParticipantJoined = async (participant: CallParticipant) => {
      // If we have a local stream, we are in the call (either active or outgoing) and should initiate peer connection
      if (localStreamRef.current && socket.id) {
        const pm = initPeerManager();
        try {
          pm.createPeerConnection(participant.socketId, localStreamRef.current);
          const offer = await pm.createOffer(participant.socketId);
          socket.emit("offer", { toSocketId: participant.socketId, offer });
        } catch (err) {
          console.error(`Error negotiating connection for joined participant ${participant.username}:`, err);
        }
      }
    };

    const onParticipantLeft = (socketId: string) => {
      if (peerManagerRef.current) {
        peerManagerRef.current.cleanupPeer(socketId);
      }
      setRemoteStreams((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    };

    const onOffer = async (payload: { fromSocketId: string; offer: RTCSessionDescriptionInit }) => {
      if (localStreamRef.current) {
        const pm = initPeerManager();
        try {
          pm.createPeerConnection(payload.fromSocketId, localStreamRef.current);
          const answer = await pm.createAnswer(payload.fromSocketId, payload.offer);
          socket.emit("answer", { toSocketId: payload.fromSocketId, answer });
        } catch (err) {
          console.error("Error generating WebRTC answer for offer:", err);
        }
      }
    };

    const onAnswer = async (payload: { fromSocketId: string; answer: RTCSessionDescriptionInit }) => {
      if (peerManagerRef.current) {
        try {
          await peerManagerRef.current.handleRemoteAnswer(payload.fromSocketId, payload.answer);
        } catch (err) {
          console.error("Error setting WebRTC remote description answer:", err);
        }
      }
    };

    const onIceCandidate = async (payload: { fromSocketId: string; candidate: RTCIceCandidateInit }) => {
      if (peerManagerRef.current) {
        await peerManagerRef.current.addIceCandidate(payload.fromSocketId, payload.candidate);
      }
    };

    const onParticipantMediaToggled = (payload: { socketId: string; mediaState: { audio: boolean; video: boolean } }) => {
      setCallState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          participants: prev.participants.map((p) =>
            p.socketId === payload.socketId ? { ...p, mediaState: payload.mediaState } : p
          ),
        };
      });
    };

    const onCallError = (msg: string) => {
      console.warn("[Call Server Error]", msg);
      setError(msg);
      // If server issues are reported, revert to safe states
      if (msg.includes("not in") || msg.includes("Failed")) {
        resetLocalCallState();
      }
    };

    const onCallEnded = (payload: { reason: "left" | "declined" | "timeout" | "disconnected"; username?: string }) => {
      toneGeneratorRef.current.playCallEnd();
      setCallFeedback({ type: payload.reason, username: payload.username });
      
      // Auto-clear feedback toast after 4 seconds
      setTimeout(() => {
        setCallFeedback(null);
      }, 4000);
    };

    socket.on("call-state", onCallState);
    socket.on("call-ended", onCallEnded);
    socket.on("participant-joined", onParticipantJoined);
    socket.on("participant-left", onParticipantLeft);
    socket.on("offer", onOffer);
    socket.on("answer", onAnswer);
    socket.on("ice-candidate", onIceCandidate);
    socket.on("participant-media-toggled", onParticipantMediaToggled);
    socket.on("call-error", onCallError);

    // ICE auto-recovery: when client network status toggles
    const handleNetworkChange = () => {
      if (navigator.onLine && isInCall && peerManagerRef.current) {
        console.log("Network online detected. Triggering ICE restart on all mesh peers...");
        peerManagerRef.current.getConnections().forEach(async (pc, targetSocketId) => {
          try {
            const offer = await pc.createOffer({ iceRestart: true });
            await pc.setLocalDescription(offer);
            socket.emit("offer", { toSocketId: targetSocketId, offer });
          } catch (err) {
            console.error(`Failed to restart ICE for ${targetSocketId}:`, err);
          }
        });
      }
    };

    window.addEventListener("online", handleNetworkChange);

    return () => {
      socket.off("call-state", onCallState);
      socket.off("call-ended", onCallEnded);
      socket.off("participant-joined", onParticipantJoined);
      socket.off("participant-left", onParticipantLeft);
      socket.off("offer", onOffer);
      socket.off("answer", onAnswer);
      socket.off("ice-candidate", onIceCandidate);
      socket.off("participant-media-toggled", onParticipantMediaToggled);
      socket.off("call-error", onCallError);
      window.removeEventListener("online", handleNetworkChange);
    };
  }, [isInCall, initPeerManager, resetLocalCallState]);

  // Clean up media on browser unload (e.g. tab refresh/close)
  useEffect(() => {
    const handleUnload = () => {
      leaveCall();
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      resetLocalCallState();
    };
  }, [leaveCall, resetLocalCallState]);

  return (
    <CallContext.Provider
      value={{
        callState,
        localStream,
        remoteStreams,
        audioEnabled,
        videoEnabled,
        cameraFacing,
        isSharingScreen,
        
        isInCall,
        incomingCall,
        outgoingCall,
        isConnecting,
        error,
        callFeedback,

        startCall,
        joinCall,
        leaveCall,
        toggleAudio,
        toggleVideo,
        switchCamera,
        toggleScreenShare,
        clearError,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
}
