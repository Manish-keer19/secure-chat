// ═══════════════════════════════════════════════════════════════════
//  Whisper Chat — App Root
//  Slim orchestrator: screen routing + sound hooks + socket wiring + WebRTC
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { AnimatePresence } from "framer-motion";
import "./App.css";

import { useViewport } from "./hooks/useViewport";
import { useSounds } from "./hooks/useSounds";
import { useSocket, SOCKET_URL } from "./hooks/useSocket";
import { CallProvider, useCall } from "./webrtc/CallContext";

import AmbientBackground from "./components/AmbientBackground";
import WakeScreen from "./components/WakeScreen";
import JoinScreen from "./components/JoinScreen";
import ChatScreen from "./components/ChatScreen";

import type { Screen } from "./types";

// Lazy-load calling UI components for performance optimization
const CallScreen = lazy(() => import("./components/call/CallScreen"));
const IncomingCallModal = lazy(() => import("./components/call/IncomingCallModal"));
const OutgoingCallModal = lazy(() => import("./components/call/OutgoingCallModal"));

function AppContent() {
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
    isGroupRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    editMessage,
    emitTyping,
  } = useSocket(username, () => {
    // Called when a message from another user arrives
    playNotificationSound();
  });

  // Consume CallContext for calling states
  const {
    callState,
    isInCall,
    incomingCall,
    outgoingCall,
    error,
    callFeedback,
    startCall,
    joinCall,
    leaveCall,
    clearError,
  } = useCall();

  // Filter typing users (exclude self)
  const activeTypers = useMemo(
    () => Array.from(typingUsers).filter((u) => u !== username),
    [typingUsers, username]
  );

  // ── Wake server ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    let wakeTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

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
            wakeTimeout = setTimeout(() => {
              if (!cancelled) setScreen("join");
            }, 600);
            return;
          }
        } catch {
          // Server not ready — retry
        }

        if (cancelled) return;
        await new Promise<void>((resolve) => {
          retryTimeout = setTimeout(() => {
            resolve();
          }, 3000);
        });
      }
    }

    pingServer();
    return () => {
      cancelled = true;
      if (wakeTimeout) clearTimeout(wakeTimeout);
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, []);

  // ── Actions ────────────────────────────────────────────────
  async function handleJoin(user: string, room: string, isGroup?: boolean) {
    const success = await joinRoom(user, room, isGroup);
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
            isGroupRoom={isGroupRoom}
            entries={entries}
            users={users}
            typingUsers={activeTypers}
            isConnected={isConnected}
            onLeave={handleLeave}
            onSend={handleSend}
            onEdit={editMessage}
            onTyping={emitTyping}
            onStartAudioCall={() => startCall("audio")}
            onStartVideoCall={() => startCall("video")}
          />
        )}
      </AnimatePresence>

      {/* WebRTC calling components lazy-loaded inside Suspense */}
      <Suspense fallback={null}>
        {incomingCall && callState && (
          <IncomingCallModal
            initiatorName={callState.participants[0]?.username || "Someone"}
            callType={callState.callType}
            onAccept={joinCall}
            onDecline={leaveCall}
          />
        )}

        {outgoingCall && callState && (
          <OutgoingCallModal
            callType={callState.callType}
            onCancel={leaveCall}
          />
        )}

        {isInCall && <CallScreen />}
      </Suspense>

      {/* Error alert toast overlay */}
      {error && (
        <div className="error-toast glass-card" onClick={clearError}>
          <span className="error-toast-text">{error}</span>
          <button className="error-toast-close" onClick={clearError} aria-label="Dismiss error">✕</button>
        </div>
      )}

      {/* Call Feedback toast overlay */}
      {callFeedback && (
        <div className="call-feedback-toast glass-card">
          <div className="call-feedback-content">
            <span className="call-feedback-icon">
              {callFeedback.type === "declined" || callFeedback.type === "timeout" ? "⚠️" : "📞"}
            </span>
            <span className="call-feedback-text">
              {callFeedback.type === "declined"
                ? `Call declined by ${callFeedback.username}`
                : callFeedback.type === "timeout"
                ? "No answer"
                : callFeedback.type === "disconnected"
                ? `${callFeedback.username || "Participant"} disconnected`
                : callFeedback.type === "left"
                ? `${callFeedback.username || "Participant"} left the call`
                : "Call ended"}
            </span>
          </div>
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <CallProvider>
      <AppContent />
    </CallProvider>
  );
}
