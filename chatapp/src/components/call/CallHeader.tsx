// ═══════════════════════════════════════════════════════════════════
//  CallHeader — Glassmorphism call header with live duration timer
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface CallHeaderProps {
  roomId: string;
  callType: "audio" | "video";
  startedAt: number;
  participantCount: number;
}

export default function CallHeader({
  roomId,
  callType,
  startedAt,
  participantCount,
}: CallHeaderProps) {
  const [duration, setDuration] = useState("00:00");

  useEffect(() => {
    const updateDuration = () => {
      const elapsed = Date.now() - startedAt;
      const hrs = Math.floor(elapsed / 3600000);
      const mins = Math.floor((elapsed % 3600000) / 60000);
      const secs = Math.floor((elapsed % 60000) / 1000);

      const timeString = hrs > 0
        ? `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
        : `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

      setDuration(timeString);
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <motion.header
      className="call-header"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="call-header-info">
        <div className="call-badge-wrapper">
          <span className={`call-type-badge ${callType}`}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              {callType === "video" ? (
                <>
                  <path d="M23 7l-7 5 7 5V7z" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </>
              ) : (
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              )}
            </svg>
            {callType === "video" ? "Video Call" : "Audio Call"}
          </span>
          <span className="call-timer">{duration}</span>
        </div>
        <h1 className="call-room-title">Room: {roomId}</h1>
      </div>

      <div className="call-header-meta">
        <span className="participant-pill">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          {participantCount} {participantCount === 1 ? "peer" : "peers"} connected
        </span>
      </div>
    </motion.header>
  );
}
