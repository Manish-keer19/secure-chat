// ═══════════════════════════════════════════════════════════════════
//  WakeScreen — Server warm-up / loading screen
// ═══════════════════════════════════════════════════════════════════

import { motion } from "framer-motion";

interface WakeScreenProps {
  status: string;
}

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 30 },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.96,
    transition: { duration: 0.25, ease: "easeIn" as const },
  },
};

export default function WakeScreen({ status }: WakeScreenProps) {
  return (
    <motion.div
      className="wake-screen"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={cardVariants}
    >
      <div className="wake-card">
        <div className="wake-spinner">
          <div className="spinner-ring" />
          <span className="wake-icon" aria-hidden="true">
            💬
          </span>
        </div>
        <h2 className="wake-title">Whisper</h2>
        <motion.p
          className="wake-status"
          key={status}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {status}
        </motion.p>
        <p className="wake-hint">
          Free servers sleep after inactivity.
          <br />
          This may take up to 30–60 seconds.
        </p>
      </div>
    </motion.div>
  );
}
