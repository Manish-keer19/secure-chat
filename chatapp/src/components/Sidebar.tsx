// ═══════════════════════════════════════════════════════════════════
//  Sidebar — Online users (drawer on mobile, fixed on desktop)
// ═══════════════════════════════════════════════════════════════════

import { motion, AnimatePresence } from "framer-motion";
import { getInitial, getAvatarColor } from "../utils/helpers";

interface SidebarProps {
  users: string[];
  username: string;
  isOpen: boolean;
  onClose: () => void;
  onLeave: () => void;
}

const sidebarVariants = {
  hidden: { x: "-100%" },
  visible: {
    x: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 30 },
  },
  exit: {
    x: "-100%",
    transition: { type: "spring" as const, stiffness: 300, damping: 30 },
  },
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export default function Sidebar({
  users,
  username,
  isOpen,
  onClose,
  onLeave,
}: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="sidebar-overlay mobile-only"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.25 }}
            onClick={onClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Desktop: always-visible sidebar (no animation) */}
      <aside className="sidebar desktop-sidebar" aria-label="Online users">
        <SidebarContent
          users={users}
          username={username}
          onLeave={onLeave}
        />
      </aside>

      {/* Mobile: animated drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            className="sidebar mobile-sidebar"
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            aria-label="Online users"
          >
            <SidebarContent
              users={users}
              username={username}
              onLeave={onLeave}
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Inner content shared between mobile/desktop ──────────────
interface SidebarContentProps {
  users: string[];
  username: string;
  onLeave: () => void;
}

function SidebarContent({ users, username, onLeave }: SidebarContentProps) {
  return (
    <>
      <div className="sidebar-header">
        <h3>
          <span className="sidebar-icon" aria-hidden="true">
            👥
          </span>
          People in Room
        </h3>
        <span className="sidebar-count" aria-label={`${users.length} users online`}>
          {users.length}
        </span>
      </div>

      <div className="sidebar-users" role="list">
        {users.map((user, i) => (
          <div
            key={i}
            className={`sidebar-user ${user === username ? "is-you" : ""}`}
            role="listitem"
          >
            <span
              className="avatar"
              style={{ background: getAvatarColor(user) }}
              aria-hidden="true"
            >
              {getInitial(user)}
            </span>
            <span className="sidebar-user-name">
              {user}
              {user === username && (
                <span className="you-badge" aria-label="You">
                  you
                </span>
              )}
            </span>
            <span className="online-dot" aria-hidden="true" />
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <button
          id="btn-leave-sidebar"
          className="btn-leave"
          onClick={onLeave}
          aria-label="Leave room"
        >
          ← Leave Room
        </button>
      </div>
    </>
  );
}
