// ═══════════════════════════════════════════════════════════════════
//  Whisper Chat — App Root
//  Slim orchestrator: screen routing + sound hooks + socket wiring
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import "./App.css";

import { useViewport } from "./hooks/useViewport";
import { useSounds } from "./hooks/useSounds";
import { useSocket, SOCKET_URL } from "./hooks/useSocket";

import AmbientBackground from "./components/AmbientBackground";
import WakeScreen from "./components/WakeScreen";
import JoinScreen from "./components/JoinScreen";
import ChatScreen from "./components/ChatScreen";

import type { Screen } from "./types";

export default function App() {
  const [screen, setScreen] = useState<Screen>("waking");
  const [wakeStatus, setWakeStatus] = useState("Connecting to server…");
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");

  // ── Hooks ──────────────────────────────────────────────────
  useViewport();
  const { playMessageSound, playNotificationSound } = useSounds();

  const {
    entries,
    users,
    typingUsers,
    isConnected,
    isConnecting,
    joinRoom,
    leaveRoom,
    sendMessage,
    emitTyping,
  } = useSocket(username, () => {
    // Called when a message from another user arrives
    playNotificationSound();
  });

  // Filter typing users (exclude self)
  const activeTypers = useMemo(
    () => Array.from(typingUsers).filter((u) => u !== username),
    [typingUsers, username]
  );

  // ── Wake server ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let attempt = 0;

    async function pingServer() {
      while (!cancelled) {
        attempt++;
        if (attempt === 1) setWakeStatus("Connecting to server…");
        else if (attempt === 2) setWakeStatus("Server is waking up…");
        else if (attempt <= 5) setWakeStatus("Still warming up, hang tight…");
        else setWakeStatus("Almost there, just a moment…");

        try {
          const res = await fetch(SOCKET_URL, {
            signal: AbortSignal.timeout(10000),
          });
          if (res.ok && !cancelled) {
            setWakeStatus("Server is ready!");
            setTimeout(() => {
              if (!cancelled) setScreen("join");
            }, 600);
            return;
          }
        } catch {
          // Server not ready — retry
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    pingServer();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Actions ────────────────────────────────────────────────
  async function handleJoin(user: string, room: string) {
    const success = await joinRoom(user, room);
    if (success) {
      setUsername(user);
      setRoomId(room);
      setScreen("chat");
    } else {
      alert("Cannot connect to chat server. Make sure the backend is running.");
    }
  }

  function handleLeave() {
    leaveRoom();
    setScreen("join");
  }

  function handleSend(text: string) {
    playMessageSound();
    sendMessage(text);
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <>
      <AmbientBackground />

      <AnimatePresence mode="wait">
        {screen === "waking" && (
          <WakeScreen key="wake" status={wakeStatus} />
        )}

        {screen === "join" && (
          <JoinScreen
            key="join"
            onJoin={handleJoin}
            isConnecting={isConnecting}
          />
        )}

        {screen === "chat" && (
          <ChatScreen
            key="chat"
            username={username}
            roomId={roomId}
            entries={entries}
            users={users}
            typingUsers={activeTypers}
            isConnected={isConnected}
            onLeave={handleLeave}
            onSend={handleSend}
            onTyping={emitTyping}
          />
        )}
      </AnimatePresence>
    </>
  );
}
