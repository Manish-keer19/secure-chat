// ═══════════════════════════════════════════════════════════════════
//  MessageBubble — Individual chat message
// ═══════════════════════════════════════════════════════════════════

import { memo } from "react";
import { motion } from "framer-motion";
import type { GroupPosition } from "../types";
import { formatTime, getInitial, getAvatarColor } from "../utils/helpers";

interface MessageBubbleProps {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  isOwn: boolean;
  groupPosition: GroupPosition;
  showSenderName: boolean;
  showAvatar: boolean;
  edited?: boolean;
  onEditClick?: (id: string, text: string) => void;
}

const bubbleVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 400, damping: 35 },
  },
};

function MessageBubbleInner({
  id,
  sender,
  text,
  timestamp,
  isOwn,
  groupPosition,
  showSenderName,
  showAvatar,
  edited,
  onEditClick,
}: MessageBubbleProps) {
  return (
    <motion.div
      className={`message ${isOwn ? "own" : "other"} position-${groupPosition}`}
      variants={bubbleVariants}
      initial="hidden"
      animate="visible"
      layout="position"
    >
      {!isOwn && (
        <div className="message-avatar-container">
          {showAvatar ? (
            <span
              className="message-avatar"
              style={{ background: getAvatarColor(sender) }}
              title={sender}
              aria-label={`Avatar for ${sender}`}
            >
              {getInitial(sender)}
            </span>
          ) : (
            <div className="message-avatar-placeholder" aria-hidden="true" />
          )}
        </div>
      )}
      <div className="message-bubble-wrapper">
        {showSenderName && !isOwn && (
          <div className="message-sender">{sender}</div>
        )}
        <div className="message-bubble-container">
          {isOwn && onEditClick && (
            <button
              onClick={() => onEditClick(id, text)}
              className="message-edit-btn"
              title="Edit message"
              aria-label="Edit message"
            >
              ✏️
            </button>
          )}
          <div className="message-bubble">
            <div className="message-text">{text}</div>
            <time className="message-time" dateTime={new Date(timestamp).toISOString()}>
              {edited && <span className="message-edited-tag">edited • </span>}
              {formatTime(timestamp)}
            </time>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default memo(MessageBubbleInner);
