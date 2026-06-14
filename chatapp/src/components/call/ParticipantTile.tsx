// ═══════════════════════════════════════════════════════════════════
//  ParticipantTile — Renders video streams or glassmorphic avatar cues
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import { getInitial, getAvatarColor } from "../../utils/helpers";

interface ParticipantTileProps {
  username: string;
  stream: MediaStream | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isLocal: boolean;
  callType: "audio" | "video";
}

export default function ParticipantTile({
  username,
  stream,
  audioEnabled,
  videoEnabled,
  isLocal,
  callType,
}: ParticipantTileProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const tileRef = useRef<HTMLDivElement>(null);

  // Toggle fullscreen state using Web APIs
  const toggleFullscreen = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (!tileRef.current) return;

    if (!document.fullscreenElement) {
      tileRef.current.requestFullscreen().catch((err) => {
        console.warn("Error attempting to enable fullscreen:", err);
      });
    } else {
      if (document.fullscreenElement === tileRef.current) {
        document.exitFullscreen().catch((err) => {
          console.warn("Error attempting to exit fullscreen:", err);
        });
      }
    }
  };

  // Sync isFullscreen state with browser fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === tileRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("msfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("msfullscreenchange", handleFullscreenChange);
    };
  }, []);


  // 1. Audio/Video Track Playback: Attach stream to video element
  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl) {
      if (stream) {
        videoEl.srcObject = stream;
        videoEl.play().catch((err) => {
          console.warn("Failed to play video/audio stream:", err);
        });
      } else {
        videoEl.srcObject = null;
      }
    }
    return () => {
      if (videoEl) {
        videoEl.srcObject = null;
      }
    };
  }, [stream]);

  // 2. Voice Activity Detection (VAD) using Web Audio API
  useEffect(() => {
    if (!stream || !audioEnabled) {
      setIsSpeaking(false);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      setIsSpeaking(false);
      return;
    }

    let audioContext: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;
    let animationFrameId: number | null = null;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContext = new AudioContextClass();
      source = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.minDecibels = -85;
      analyser.maxDecibels = -10;
      analyser.smoothingTimeConstant = 0.8;

      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let speakingCounter = 0;

      const checkVolume = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // Active speech threshold
        if (average > 15) {
          speakingCounter = Math.min(speakingCounter + 1, 4);
        } else {
          speakingCounter = Math.max(speakingCounter - 1, 0);
        }

        setIsSpeaking(speakingCounter > 1);

        animationFrameId = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err) {
      console.warn("Failed to initialize audio analyser for speaking indicator:", err);
    }

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      if (source) {
        source.disconnect();
      }
      if (audioContext && audioContext.state !== "closed") {
        audioContext.close().catch(() => { });
      }
    };
  }, [stream, audioEnabled]);

  const showVideo = callType === "video" && videoEnabled && stream;
  const avatarBg = getAvatarColor(username);

  return (
    <div
      ref={tileRef}
      onDoubleClick={() => toggleFullscreen()}
      className={`participant-tile ${isLocal ? "local-tile" : ""} ${isSpeaking ? "speaking" : ""} ${isFullscreen ? "fullscreen-active" : ""}`}
    >
      {stream && (
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted={isLocal} // MUST mute local video to prevent echo loop
          className="participant-video"
          style={{ display: showVideo ? "block" : "none" }}
        />
      )}

      {!showVideo && (
        <div className={`participant-avatar-placeholder ${isSpeaking ? "speaking" : ""}`} style={{ background: avatarBg }}>
          <span className="avatar-initial">{getInitial(username)}</span>
          {isSpeaking && (
            <>
              <div className="speaking-ring ring-1"></div>
              <div className="speaking-ring ring-2"></div>
            </>
          )}
        </div>
      )}

      {/* Overlay info */}
      <div className="participant-overlay">
        <span className="participant-name" style={{ display: "flex", alignItems: "center" }}>
          {username} {isLocal && "(You)"}
          {isSpeaking && callType === "audio" && (
            <span className="speaking-wave-indicator" aria-label="Speaking" style={{ marginLeft: "8px" }}>
              <span className="bar bar-1"></span>
              <span className="bar bar-2"></span>
              <span className="bar bar-3"></span>
              <span className="bar bar-4"></span>
            </span>
          )}
        </span>
        <div className="participant-indicators">
          {/* Fullscreen Toggle Button */}
          {callType === "video" && (
            <button
              onClick={toggleFullscreen}
              className={`btn-fullscreen ${isFullscreen ? "active" : ""}`}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 14 10 14 10 20" />
                  <polyline points="20 10 14 10 14 4" />
                  <line x1="14" y1="10" x2="21" y2="3" />
                  <line x1="10" y1="14" x2="3" y2="21" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              )}
            </button>
          )}

          {/* Mic Status Indicator */}
          {!audioEnabled && (
            <span className="indicator-icon muted" title="Microphone muted">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                <path d="M19 10v1a6.93 6.93 0 0 1-.46 2.5m-2.6 1A6.97 6.97 0 0 1 12 15a7 7 0 0 1-7-7v-2" />
              </svg>
            </span>
          )}
          {/* Video Status Indicator */}
          {callType === "video" && !videoEnabled && (
            <span className="indicator-icon video-off" title="Camera off">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M16 16a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m8.59-1.41L16 5v2.59M23 7v10l-4.59-3.28" />
              </svg>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
