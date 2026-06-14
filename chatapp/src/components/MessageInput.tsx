// ═══════════════════════════════════════════════════════════════════
//  MessageInput — Auto-resizing textarea + send button
// ═══════════════════════════════════════════════════════════════════

import { useRef, useCallback, type KeyboardEvent } from "react";
import { motion } from "framer-motion";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onTyping: () => void;
  isEditing?: boolean;
  onCancelEdit?: () => void;
}

export default function MessageInput({
  value,
  onChange,
  onSend,
  onTyping,
  isEditing = false,
  onCancelEdit,
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = useCallback(
    (val: string) => {
      onChange(val);
      onTyping();

      // Auto-resize
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height =
          Math.min(textareaRef.current.scrollHeight, 120) + "px";
      }
    },
    [onChange, onTyping]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSend();
        // Reset height after send
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      } else if (e.key === "Escape" && isEditing && onCancelEdit) {
        e.preventDefault();
        onCancelEdit();
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      }
    },
    [onSend, isEditing, onCancelEdit]
  );

  const handleSendClick = useCallback(() => {
    onSend();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  }, [onSend]);

  return (
    <div className="message-input-area">
      {isEditing && (
        <div className="editing-banner">
          <span className="editing-banner-text">✏️ Editing message…</span>
          <button className="btn-cancel-edit" onClick={onCancelEdit} aria-label="Cancel editing">
            ✕
          </button>
        </div>
      )}
      <div className="message-input-wrapper">
        <textarea
          ref={textareaRef}
          id="message-input"
          className="message-input"
          placeholder="Type a message…"
          value={value}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          aria-label="Type a message"
        />
        <motion.button
          id="btn-send"
          className="btn-send"
          onClick={handleSendClick}
          disabled={!value.trim()}
          title={isEditing ? "Save changes" : "Send message"}
          aria-label={isEditing ? "Save changes" : "Send message"}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.9 }}
        >
          {isEditing ? (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </motion.button>
      </div>
    </div>
  );
}
