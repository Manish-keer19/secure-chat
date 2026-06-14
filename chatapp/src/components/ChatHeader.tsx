// ═══════════════════════════════════════════════════════════════════
//  ChatHeader — Glassmorphism sticky header
// ═══════════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatHeaderProps {
  roomId: string;
  isConnected: boolean;
  userCount: number;
  isGroupRoom?: boolean;
  onLeave: () => void;
  onToggleSidebar: () => void;
  onStartAudioCall?: () => void;
  onStartVideoCall?: () => void;
}

export default function ChatHeader({
  roomId,
  isConnected,
  userCount,
  isGroupRoom,
  onLeave,
  onToggleSidebar,
  onStartAudioCall,
  onStartVideoCall,
}: ChatHeaderProps) {
  const [copied, setCopied] = useState(false);

  const copyRoomCode = useCallback(() => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [roomId]);

  return (
    <header className="chat-header" role="banner">
      <motion.button
        id="btn-leave"
        className="btn-back"
        onClick={onLeave}
        title="Leave room"
        aria-label="Leave room"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
      </motion.button>

      <div className="chat-header-info">
        <h2>
          Room{" "}
          <motion.span
            className={`room-badge ${copied ? "copied" : ""}`}
            onClick={copyRoomCode}
            title="Click to copy room code"
            role="button"
            tabIndex={0}
            aria-label={`Room code: ${roomId}. Click to copy.`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") copyRoomCode();
            }}
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={copied ? "copied" : "code"}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
              >
                {copied ? "Copied! ✓" : roomId}
              </motion.span>
            </AnimatePresence>
          </motion.span>
        </h2>
        <div className="chat-header-meta">
          <span
            className={`connection-status ${isConnected ? "online" : "offline"}`}
            aria-label={isConnected ? "Connected" : "Reconnecting"}
          >
            <span className="status-dot" />
            {isConnected ? "Live" : "Reconnecting…"}
          </span>
          <span className="meta-separator" aria-hidden="true">
            •
          </span>
          <span className="online-count">
            {userCount} {userCount === 1 ? "user" : "users"}
            {isGroupRoom !== undefined && (
              <span className="room-type-badge" style={{ marginLeft: "8px", fontSize: "0.65rem", padding: "1px 6px", borderRadius: "4px", background: isGroupRoom ? "rgba(167, 139, 250, 0.12)" : "rgba(52, 211, 153, 0.12)", color: isGroupRoom ? "var(--accent)" : "#34d399", border: `1px solid ${isGroupRoom ? "rgba(167, 139, 250, 0.2)" : "rgba(52, 211, 153, 0.2)"}` }}>
                {isGroupRoom ? "Group" : "1-on-1"}
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="chat-header-actions" style={{ display: "flex", gap: "8px" }}>
        {onStartAudioCall && (
          <motion.button
            id="btn-audio-call"
            className="btn-call-trigger"
            onClick={onStartAudioCall}
            title="Start voice call"
            aria-label="Start voice call"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            style={{ padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg-glass)", color: "var(--text-secondary)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </motion.button>
        )}

        {onStartVideoCall && (
          <motion.button
            id="btn-video-call"
            className="btn-call-trigger"
            onClick={onStartVideoCall}
            title="Start video call"
            aria-label="Start video call"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            style={{ padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg-glass)", color: "var(--text-secondary)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </motion.button>
        )}

        <motion.button
          id="btn-toggle-users"
          className="btn-users-toggle"
          onClick={onToggleSidebar}
          title="Show users"
          aria-label="Show online users"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </motion.button>
      </div>
    </header>
  );
}
