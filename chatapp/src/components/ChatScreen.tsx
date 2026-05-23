// ═══════════════════════════════════════════════════════════════════
//  ChatScreen — Main chat layout
// ═══════════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import type { ChatEntry } from "../types";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import Sidebar from "./Sidebar";

interface ChatScreenProps {
  username: string;
  roomId: string;
  entries: ChatEntry[];
  users: string[];
  typingUsers: string[];
  isConnected: boolean;
  onLeave: () => void;
  onSend: (text: string) => void;
  onTyping: () => void;
}

const screenVariants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    transition: { duration: 0.2, ease: "easeIn" as const },
  },
};

export default function ChatScreen({
  username,
  roomId,
  entries,
  users,
  typingUsers,
  isConnected,
  onLeave,
  onSend,
  onTyping,
}: ChatScreenProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);

  const handleSend = useCallback(() => {
    const text = messageText.trim();
    if (!text) return;
    onSend(text);
    setMessageText("");
  }, [messageText, onSend]);

  const handleLeave = useCallback(() => {
    setIsSidebarOpen(false);
    setMessageText("");
    setCodeCopied(false);
    onLeave();
  }, [onLeave]);

  const handleCopyRoomCode = useCallback(() => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  }, [roomId]);

  return (
    <motion.div
      className="chat-screen"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={screenVariants}
    >
      <Sidebar
        users={users}
        username={username}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLeave={handleLeave}
      />

      <main className="chat-main">
        <ChatHeader
          roomId={roomId}
          isConnected={isConnected}
          userCount={users.length}
          onLeave={handleLeave}
          onToggleSidebar={() => setIsSidebarOpen(true)}
        />

        <MessageList
          entries={entries}
          username={username}
          typingUsers={typingUsers}
          roomId={roomId}
          onCopyRoomCode={handleCopyRoomCode}
          codeCopied={codeCopied}
        />

        <MessageInput
          value={messageText}
          onChange={setMessageText}
          onSend={handleSend}
          onTyping={onTyping}
        />
      </main>
    </motion.div>
  );
}
