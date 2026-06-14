// ═══════════════════════════════════════════════════════════════════
//  JoinScreen — Room join / onboarding card
// ═══════════════════════════════════════════════════════════════════

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";

interface JoinScreenProps {
  onJoin: (username: string, roomId: string, isGroup: boolean) => void;
  isConnecting: boolean;
}

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 260, damping: 28, delay: 0.05 },
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    transition: { duration: 0.2, ease: "easeIn" as const },
  },
};

const staggerContainer = {
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.35 },
  },
};

const featureItem = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

export default function JoinScreen({ onJoin, isConnecting }: JoinScreenProps) {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [isGroup, setIsGroup] = useState(true);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedUser = username.trim();
    const trimmedRoom = roomId.trim();
    if (!trimmedUser || !trimmedRoom) return;
    onJoin(trimmedUser, trimmedRoom, isGroup);
  }

  return (
    <motion.div
      className="join-screen"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={cardVariants}
    >
      <div className="join-card">
        <div className="join-logo">
          <div className="join-logo-icon" aria-hidden="true">
            💬
          </div>
          <h1>Whisper</h1>
        </div>

        <p className="join-tagline">
          Private ephemeral chat rooms.
          <br />
          No accounts. No database. No traces.
        </p>

        <form className="join-form" onSubmit={handleSubmit} id="join-form">
          <div className="input-group">
            <label htmlFor="username-input">Your Name</label>
            <input
              id="username-input"
              className="input-field"
              type="text"
              placeholder="Pick a display name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              autoComplete="off"
              autoFocus
              aria-required="true"
            />
          </div>

          <div className="input-group">
            <label htmlFor="room-input">Room Code</label>
            <input
              id="room-input"
              className="input-field"
              type="text"
              placeholder="Enter a room code (e.g. 1234)"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              maxLength={20}
              autoComplete="off"
              aria-required="true"
            />
          </div>

          <div className="input-group toggle-group">
            <label>Room Type</label>
            <div className="room-type-toggle-wrapper">
              <button
                type="button"
                className={`toggle-btn ${!isGroup ? "active" : ""}`}
                onClick={() => setIsGroup(false)}
              >
                👤 1-on-1 Chat
              </button>
              <button
                type="button"
                className={`toggle-btn ${isGroup ? "active" : ""}`}
                onClick={() => setIsGroup(true)}
              >
                👥 Group Chat
              </button>
            </div>
          </div>

          <motion.button
            id="join-button"
            className="btn-primary"
            type="submit"
            disabled={!username.trim() || !roomId.trim() || isConnecting}
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.97 }}
          >
            {isConnecting ? "Connecting…" : "Enter Room"}
          </motion.button>
        </form>

        <motion.div
          className="join-features"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {[
            { icon: "🛡️", text: "No data stored — ever" },
            { icon: "⚡", text: "Real-time messaging" },
            { icon: "👻", text: "Vanishes when you leave" },
          ].map((f) => (
            <motion.div key={f.text} className="feature-item" variants={featureItem}>
              <span className="feature-icon" aria-hidden="true">
                {f.icon}
              </span>
              <span>{f.text}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
