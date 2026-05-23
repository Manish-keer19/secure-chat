// ═══════════════════════════════════════════════════════════════════
//  ChatHeader — Glassmorphism sticky header
// ═══════════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatHeaderProps {
  roomId: string;
  isConnected: boolean;
  userCount: number;
  onLeave: () => void;
  onToggleSidebar: () => void;
}

export default function ChatHeader({
  roomId,
  isConnected,
  userCount,
  onLeave,
  onToggleSidebar,
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
          </span>
        </div>
      </div>

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
    </header>
  );
}
