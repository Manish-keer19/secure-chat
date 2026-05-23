// ═══════════════════════════════════════════════════════════════════
//  SystemMessage — Centered info pill
// ═══════════════════════════════════════════════════════════════════

import { memo } from "react";
import { motion } from "framer-motion";

interface SystemMessageProps {
  id: string;
  text: string;
}

function SystemMessageInner({ text }: SystemMessageProps) {
  return (
    <motion.div
      className="system-message"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      role="status"
    >
      <span className="system-message-text">{text}</span>
    </motion.div>
  );
}

export default memo(SystemMessageInner);
