// ═══════════════════════════════════════════════════════════════════
//  TypingIndicator — Animated dots with user names
// ═══════════════════════════════════════════════════════════════════

import { motion } from "framer-motion";

interface TypingIndicatorProps {
  typers: string[];
}

export default function TypingIndicator({ typers }: TypingIndicatorProps) {
  if (typers.length === 0) return null;

  const label =
    typers.length === 1
      ? `${typers[0]} is typing`
      : `${typers.length} people typing`;

  return (
    <motion.div
      className="typing-indicator"
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      aria-live="polite"
      aria-label={label}
    >
      <div className="typing-bubble">
        <div className="typing-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <span className="typing-text">{label}</span>
      </div>
    </motion.div>
  );
}
