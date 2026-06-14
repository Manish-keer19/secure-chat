// ═══════════════════════════════════════════════════════════════════
//  OutgoingCallModal — Outgoing calling alert modal
// ═══════════════════════════════════════════════════════════════════

import { motion } from "framer-motion";

interface OutgoingCallModalProps {
  callType: "audio" | "video";
  onCancel: () => void;
}

export default function OutgoingCallModal({
  callType,
  onCancel,
}: OutgoingCallModalProps) {
  return (
    <div className="call-modal-overlay">
      <motion.div
        className="call-alert-modal glass-card outgoing-dial"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
      >
        <div className="dial-animation-container">
          <div className="dial-pulse pulse-1" />
          <div className="dial-pulse pulse-2" />
          <div className="dial-icon-circle">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>
        </div>

        <div className="dial-text-block">
          <h2 className="dial-heading">Calling room...</h2>
          <p className="dial-subtext">Waiting for other participants to join the {callType} call</p>
        </div>

        <div className="call-alert-actions single-action">
          <button className="btn-decline cancel-dial" onClick={onCancel} aria-label="Cancel Call">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" transform="rotate(135 12 12)" />
            </svg>
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}
