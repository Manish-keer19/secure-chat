// ═══════════════════════════════════════════════════════════════════
//  ChatScreen — Main chat layout
// ═══════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import type { ChatEntry } from "../types";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import Sidebar from "./Sidebar";

interface ChatScreenProps {
  username: string;
  roomId: string;
  isGroupRoom?: boolean;
  entries: ChatEntry[];
  users: string[];
  typingUsers: string[];
  isConnected: boolean;
  onLeave: () => void;
  onSend: (text: string) => void;
  onEdit?: (id: string, text: string) => void;
  onTyping: () => void;
  onStartAudioCall?: () => void;
  onStartVideoCall?: () => void;
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
  isGroupRoom,
  entries,
  users,
  typingUsers,
  isConnected,
  onLeave,
  onSend,
  onEdit,
  onTyping,
  onStartAudioCall,
  onStartVideoCall,
}: ChatScreenProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [editingMessage, setEditingMessage] = useState<{ id: string; text: string } | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleSend = useCallback(() => {
    const text = messageText.trim();
    if (!text) return;
    if (editingMessage) {
      onEdit?.(editingMessage.id, text);
      setEditingMessage(null);
    } else {
      onSend(text);
    }
    setMessageText("");
  }, [messageText, onSend, onEdit, editingMessage]);

  const handleStartEdit = useCallback((id: string, text: string) => {
    setEditingMessage({ id, text });
    setMessageText(text);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
    setMessageText("");
  }, []);

  const handleLeave = useCallback(() => {
    setIsSidebarOpen(false);
    setMessageText("");
    setEditingMessage(null);
    setCodeCopied(false);
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
    onLeave();
  }, [onLeave]);

  const handleCopyRoomCode = useCallback(() => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId).then(() => {
      setCodeCopied(true);
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => {
        setCodeCopied(false);
        copyTimeoutRef.current = null;
      }, 2000);
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
          isGroupRoom={isGroupRoom}
          onLeave={handleLeave}
          onToggleSidebar={() => setIsSidebarOpen(true)}
          onStartAudioCall={onStartAudioCall}
          onStartVideoCall={onStartVideoCall}
        />

        <MessageList
          entries={entries}
          username={username}
          typingUsers={typingUsers}
          roomId={roomId}
          onCopyRoomCode={handleCopyRoomCode}
          codeCopied={codeCopied}
          onEditClick={handleStartEdit}
        />

        <MessageInput
          value={messageText}
          onChange={setMessageText}
          onSend={handleSend}
          onTyping={onTyping}
          isEditing={!!editingMessage}
          onCancelEdit={handleCancelEdit}
        />
      </main>
    </motion.div>
  );
}
