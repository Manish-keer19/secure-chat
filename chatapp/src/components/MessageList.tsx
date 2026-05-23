// ═══════════════════════════════════════════════════════════════════
//  MessageList — Scrollable message container
// ═══════════════════════════════════════════════════════════════════

import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import type { ChatEntry } from "../types";
import { groupEntries } from "../utils/helpers";
import MessageBubble from "./MessageBubble";
import SystemMessage from "./SystemMessage";
import TypingIndicator from "./TypingIndicator";

interface MessageListProps {
  entries: ChatEntry[];
  username: string;
  typingUsers: string[];
  roomId: string;
  onCopyRoomCode: () => void;
  codeCopied: boolean;
}

export default function MessageList({
  entries,
  username,
  typingUsers,
  roomId,
  onCopyRoomCode,
  codeCopied,
}: MessageListProps) {
  const areaRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);

  // Memoize grouped entries
  const grouped = useMemo(() => groupEntries(entries), [entries]);

  // ── Scroll to bottom ────────────────────────────────────────
  const scrollToBottom = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      if (areaRef.current) {
        areaRef.current.scrollTo({
          top: areaRef.current.scrollHeight,
          behavior: smooth ? "smooth" : "instant",
        });
      }
    });
  }, []);

  // Detect user scrolling away from bottom
  const handleScroll = useCallback(() => {
    if (!areaRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = areaRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 80;
    setUserHasScrolledUp(!isNearBottom);
  }, []);

  // Auto-scroll on new messages (unless user scrolled up)
  useEffect(() => {
    if (!userHasScrolledUp) {
      scrollToBottom();
    }
  }, [entries, userHasScrolledUp, scrollToBottom]);

  // Auto-scroll when typing indicator appears
  useEffect(() => {
    if (typingUsers.length > 0 && !userHasScrolledUp) {
      scrollToBottom();
    }
  }, [typingUsers, userHasScrolledUp, scrollToBottom]);

  // Instant scroll on first load
  useEffect(() => {
    scrollToBottom(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="messages-area"
      id="messages-area"
      ref={areaRef}
      onScroll={handleScroll}
      role="log"
      aria-label="Chat messages"
      aria-live="polite"
    >
      {grouped.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">
            💬
          </div>
          <h3>No messages yet</h3>
          <p>
            Share the room code <strong>{roomId}</strong> with your friends to
            start a private conversation.
          </p>
          <button
            onClick={onCopyRoomCode}
            className={`btn-secondary ${codeCopied ? "copied" : ""}`}
            aria-label="Copy room code"
          >
            {codeCopied ? "Copied Room Code! ✓" : "Copy Room Code"}
          </button>
        </div>
      )}

      <AnimatePresence initial={false}>
        {grouped.map((entry) => {
          if (entry.type === "system") {
            return (
              <SystemMessage
                key={entry.data.id}
                id={entry.data.id}
                text={entry.data.text}
              />
            );
          }

          const msg = entry.data;
          const isOwn = msg.sender === username;

          return (
            <MessageBubble
              key={msg.id}
              id={msg.id}
              sender={msg.sender}
              text={msg.text}
              timestamp={msg.timestamp}
              isOwn={isOwn}
              groupPosition={entry.groupPosition}
              showSenderName={entry.showSenderName}
              showAvatar={entry.showAvatar}
            />
          );
        })}
      </AnimatePresence>

      <AnimatePresence>
        {typingUsers.length > 0 && (
          <TypingIndicator key="typing" typers={typingUsers} />
        )}
      </AnimatePresence>

      <div ref={endRef} aria-hidden="true" />
    </div>
  );
}
