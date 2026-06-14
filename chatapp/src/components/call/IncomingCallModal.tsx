// ═══════════════════════════════════════════════════════════════════
//  IncomingCallModal — Incoming alert modal
// ═══════════════════════════════════════════════════════════════════

import { motion } from "framer-motion";
import { getAvatarColor, getInitial } from "../../utils/helpers";

interface IncomingCallModalProps {
  initiatorName: string;
  callType: "audio" | "video";
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallModal({
  initiatorName,
  callType,
  onAccept,
  onDecline,
}: IncomingCallModalProps) {
  const avatarBg = getAvatarColor(initiatorName);

  return (
    <div className="call-modal-overlay">
      <motion.div
        className="call-alert-modal glass-card"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
      >
        <div className="call-alert-header">
          <span className="pulse-dot-ring">
            <span className="pulse-dot" />
          </span>
          <span className="alert-badge">Incoming {callType} Call</span>
        </div>

        <div className="call-alert-body">
          <div className="caller-avatar" style={{ background: avatarBg }}>
            {getInitial(initiatorName)}
          </div>
          <h2 className="caller-name">{initiatorName}</h2>
          <p className="call-invite-text">is inviting you to a room call</p>
        </div>

        <div className="call-alert-actions">
          {/* Decline Button */}
          <button className="btn-decline" onClick={onDecline} aria-label="Decline Call">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" transform="rotate(135 12 12)" />
            </svg>
            Decline
          </button>

          {/* Accept Button */}
          <button className="btn-accept" onClick={onAccept} aria-label="Accept Call">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            Accept
          </button>
        </div>
      </motion.div>
    </div>
  );
}
