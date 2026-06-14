// ═══════════════════════════════════════════════════════════════════
//  CallControls — Action buttons tray for call states toggling
// ═══════════════════════════════════════════════════════════════════

import { motion } from "framer-motion";

interface CallControlsProps {
  audioEnabled: boolean;
  videoEnabled: boolean;
  isSharingScreen: boolean;
  callType: "audio" | "video";
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onSwitchCamera: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
}

export default function CallControls({
  audioEnabled,
  videoEnabled,
  isSharingScreen,
  callType,
  onToggleAudio,
  onToggleVideo,
  onSwitchCamera,
  onToggleScreenShare,
  onLeave,
}: CallControlsProps) {
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  return (
    <motion.div
      className="call-controls-tray"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* ── Audio Control (Mic Toggle) ────────────────────────────────── */}
      <motion.button
        className={`btn-control ${audioEnabled ? "active" : "disabled"}`}
        onClick={onToggleAudio}
        title={audioEnabled ? "Mute Microphone" : "Unmute Microphone"}
        aria-label={audioEnabled ? "Mute Microphone" : "Unmute Microphone"}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {audioEnabled ? (
            <>
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </>
          ) : (
            <>
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
              <path d="M19 10v1a6.93 6.93 0 0 1-.46 2.5m-2.6 1A6.97 6.97 0 0 1 12 15a7 7 0 0 1-7-7v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </>
          )}
        </svg>
      </motion.button>

      {/* ── Video Control (Camera Toggle) ───────────────────────────────── */}
      {callType === "video" && (
        <motion.button
          className={`btn-control ${videoEnabled ? "active" : "disabled"}`}
          onClick={onToggleVideo}
          title={videoEnabled ? "Turn Camera Off" : "Turn Camera On"}
          aria-label={videoEnabled ? "Turn Camera Off" : "Turn Camera On"}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {videoEnabled ? (
              <>
                <path d="M23 7l-7 5 7 5V7z" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </>
            ) : (
              <>
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M16 16a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m8.59-1.41L16 5v2.59M23 7v10l-4.59-3.28" />
              </>
            )}
          </svg>
        </motion.button>
      )}

      {/* ── Flip Camera (Mobile-Only) ─────────────────────────────────── */}
      {callType === "video" && videoEnabled && isMobile && (
        <motion.button
          className="btn-control camera-switch active"
          onClick={onSwitchCamera}
          title="Switch Camera (Front/Rear)"
          aria-label="Switch Camera (Front/Rear)"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </motion.button>
      )}

      {/* ── Screen Share Control (Desktop-Only) ───────────────────────── */}
      {callType === "video" && videoEnabled && !isMobile && (
        <motion.button
          className={`btn-control screen-share ${isSharingScreen ? "sharing" : "active"}`}
          onClick={onToggleScreenShare}
          title={isSharingScreen ? "Stop Screen Share" : "Share Screen"}
          aria-label={isSharingScreen ? "Stop Screen Share" : "Share Screen"}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
            {isSharingScreen && <line x1="1" y1="1" x2="23" y2="23" stroke="#f87171" strokeWidth="2" />}
          </svg>
        </motion.button>
      )}

      {/* ── End Call (Hang Up) ────────────────────────────────────────── */}
      <motion.button
        className="btn-control hangup"
        onClick={onLeave}
        title="Leave Call"
        aria-label="Leave Call"
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.88 }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" transform="rotate(135 12 12)" />
        </svg>
      </motion.button>
    </motion.div>
  );
}
