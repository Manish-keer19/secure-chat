import { useState, useEffect, useRef, useCallback, type FormEvent, type KeyboardEvent } from "react";
import { io, type Socket } from "socket.io-client";
import "./App.css";

// ─── Types ──────────────────────────────────────────────────────────
interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

interface SystemMessage {
  id: string;
  text: string;
  timestamp: number;
}

type ChatEntry =
  | { type: "message"; data: Message }
  | { type: "system"; data: SystemMessage };

// ─── Socket ─────────────────────────────────────────────────────────
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: false });
  }
  return socket;
}

// ─── Helpers ────────────────────────────────────────────────────────
function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

// Color palette for user avatars — deterministic by name
const AVATAR_COLORS = [
  "linear-gradient(135deg, #a78bfa, #6366f1)",
  "linear-gradient(135deg, #f472b6, #ec4899)",
  "linear-gradient(135deg, #34d399, #059669)",
  "linear-gradient(135deg, #fbbf24, #f59e0b)",
  "linear-gradient(135deg, #60a5fa, #3b82f6)",
  "linear-gradient(135deg, #fb923c, #ea580c)",
  "linear-gradient(135deg, #a3e635, #65a30d)",
  "linear-gradient(135deg, #e879f9, #c026d3)",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ═════════════════════════════════════════════════════════════════════
//  App Component
// ═════════════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState<"waking" | "join" | "chat">("waking");
  const [wakeStatus, setWakeStatus] = useState("Connecting to server…");
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [showUsers, setShowUsers] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [messageText, setMessageText] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Scroll to bottom ────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, []);

  // ── Wake up Render backend ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let attempt = 0;

    async function pingServer() {
      while (!cancelled) {
        attempt++;
        try {
          if (attempt === 1) setWakeStatus("Connecting to server…");
          else if (attempt === 2) setWakeStatus("Server is waking up…");
          else if (attempt <= 5) setWakeStatus("Still warming up, hang tight…");
          else setWakeStatus("Almost there, just a moment…");

          const res = await fetch(SOCKET_URL, { signal: AbortSignal.timeout(10000) });
          if (res.ok) {
            if (!cancelled) {
              setWakeStatus("Server is ready!");
              // Small delay so user sees the "ready" message
              setTimeout(() => { if (!cancelled) setScreen("join"); }, 600);
            }
            return;
          }
        } catch {
          // Server not ready yet — retry after a short delay
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    pingServer();
    return () => { cancelled = true; };
  }, []);

  // ── Socket listeners ────────────────────────────────────────────
  useEffect(() => {
    const s = getSocket();

    s.on("message-history", (messages: Message[]) => {
      setEntries(messages.map((m) => ({ type: "message", data: m })));
      scrollToBottom();
    });

    s.on("new-message", (message: Message) => {
      setEntries((prev) => [...prev, { type: "message", data: message }]);
      scrollToBottom();
    });

    s.on("system-message", (msg: SystemMessage) => {
      setEntries((prev) => [...prev, { type: "system", data: msg }]);
      scrollToBottom();
    });

    s.on("room-users", (userList: string[]) => {
      setUsers(userList);
    });

    s.on("user-typing", (user: string) => {
      setTypingUsers((prev) => new Set(prev).add(user));
    });

    s.on("user-stop-typing", (user: string) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(user);
        return next;
      });
    });

    s.on("disconnect", () => {
      setEntries((prev) => [
        ...prev,
        {
          type: "system",
          data: {
            id: "dc-" + Date.now(),
            text: "Connection lost. Reconnecting…",
            timestamp: Date.now(),
          },
        },
      ]);
    });

    return () => {
      s.off("message-history");
      s.off("new-message");
      s.off("system-message");
      s.off("room-users");
      s.off("user-typing");
      s.off("user-stop-typing");
      s.off("disconnect");
    };
  }, [scrollToBottom]);

  // ── Join Room ───────────────────────────────────────────────────
  function handleJoin(e: FormEvent) {
    e.preventDefault();
    const trimmedUser = username.trim();
    const trimmedRoom = roomId.trim();
    if (!trimmedUser || !trimmedRoom) return;

    setIsConnecting(true);
    const s = getSocket();

    if (!s.connected) {
      s.connect();
      s.once("connect", () => {
        s.emit("join-room", { roomId: trimmedRoom, username: trimmedUser });
        setScreen("chat");
        setIsConnecting(false);
      });
      s.once("connect_error", () => {
        setIsConnecting(false);
        alert("Cannot connect to chat server. Make sure the backend is running.");
      });
    } else {
      s.emit("join-room", { roomId: trimmedRoom, username: trimmedUser });
      setScreen("chat");
      setIsConnecting(false);
    }
  }

  // ── Leave Room ──────────────────────────────────────────────────
  function handleLeave() {
    const s = getSocket();
    s.disconnect();
    socket = null;
    setScreen("join");
    setEntries([]);
    setUsers([]);
    setTypingUsers(new Set());
    setShowUsers(false);
    setMessageText("");
  }

  // ── Send Message ────────────────────────────────────────────────
  function handleSend() {
    const text = messageText.trim();
    if (!text) return;

    const s = getSocket();
    s.emit("send-message", { text });
    s.emit("stop-typing");
    setMessageText("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  // ── Typing ──────────────────────────────────────────────────────
  function handleTyping() {
    const s = getSocket();
    s.emit("typing");

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      s.emit("stop-typing");
    }, 2000);
  }

  // ── Textarea auto-resize & enter-to-send ────────────────────────
  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleTextareaInput(value: string) {
    setMessageText(value);
    handleTyping();

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }

  // ── Active typing users (excluding self) ────────────────────────
  const activeTypers = Array.from(typingUsers).filter((u) => u !== username);

  // ═══════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <>
      {/* Ambient background */}
      <div className="app-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      {screen === "waking" ? (
        /* ── WAKE-UP SCREEN ────────────────────────────────────── */
        <div className="wake-screen">
          <div className="wake-card">
            <div className="wake-spinner">
              <div className="spinner-ring" />
              <span className="wake-icon">💬</span>
            </div>
            <h2 className="wake-title">Whisper</h2>
            <p className="wake-status">{wakeStatus}</p>
            <p className="wake-hint">
              Free servers sleep after inactivity.
              <br />
              This may take up to 30–60 seconds.
            </p>
          </div>
        </div>
      ) : screen === "join" ? (
        /* ── JOIN SCREEN ──────────────────────────────────────── */
        <div className="join-screen">
          <div className="join-card">
            <div className="join-logo">
              <div className="join-logo-icon">💬</div>
              <h1>Whisper</h1>
            </div>
            <p className="join-tagline">
              Private ephemeral chat rooms.
              <br />
              No accounts. No database. No traces.
            </p>

            <form className="join-form" onSubmit={handleJoin} id="join-form">
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
                />
              </div>

              <button
                id="join-button"
                className="btn-primary"
                type="submit"
                disabled={!username.trim() || !roomId.trim() || isConnecting}
              >
                {isConnecting ? "Connecting…" : "Enter Room"}
              </button>
            </form>

            <div className="join-features">
              <div className="feature-item">
                <span className="feature-icon">🛡️</span>
                <span>No data stored — ever</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">⚡</span>
                <span>Real-time messaging</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">👻</span>
                <span>Vanishes when you leave</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── CHAT SCREEN ──────────────────────────────────────── */
        <div className="chat-screen">
          {/* Desktop sidebar */}
          <aside className="sidebar">
            <div className="sidebar-header">
              <h3>
                <span className="sidebar-icon">👥</span>
                People
              </h3>
              <span className="sidebar-count">{users.length}</span>
            </div>
            <div className="sidebar-users">
              {users.map((user, i) => (
                <div
                  key={i}
                  className={`sidebar-user ${user === username ? "is-you" : ""}`}
                >
                  <span
                    className="avatar"
                    style={{ background: getAvatarColor(user) }}
                  >
                    {getInitial(user)}
                  </span>
                  <span className="sidebar-user-name">
                    {user}
                    {user === username && <span className="you-badge">you</span>}
                  </span>
                  <span className="online-dot" />
                </div>
              ))}
            </div>
            <div className="sidebar-footer">
              <button id="btn-leave-sidebar" className="btn-leave" onClick={handleLeave}>
                ← Leave Room
              </button>
            </div>
          </aside>

          {/* Main chat area */}
          <main className="chat-main">
            {/* Header */}
            <header className="chat-header">
              <button
                id="btn-leave"
                className="btn-back"
                onClick={handleLeave}
                title="Leave room"
              >
                ←
              </button>

              <div className="chat-header-info">
                <h2>
                  Room <span className="room-badge">{roomId}</span>
                </h2>
                <span className="online-count">
                  <span className="online-dot" />
                  {users.length} online
                </span>
              </div>

              <button
                id="btn-toggle-users"
                className="btn-users-toggle"
                onClick={() => setShowUsers((v) => !v)}
                title="Show users"
              >
                👥
              </button>
            </header>

            {/* Mobile users panel */}
            {showUsers && (
              <div className="users-panel-mobile">
                {users.map((user, i) => (
                  <div
                    key={i}
                    className={`user-chip ${user === username ? "is-you" : ""}`}
                  >
                    <span
                      className="avatar"
                      style={{ background: getAvatarColor(user) }}
                    >
                      {getInitial(user)}
                    </span>
                    <span>
                      {user}
                      {user === username ? " (you)" : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Messages */}
            <div className="messages-area" id="messages-area">
              {entries.length === 0 && (
                <div className="empty-state">
                  <span className="icon">💬</span>
                  <h3>No messages yet</h3>
                  <p>
                    Send the room code <strong>{roomId}</strong> to your friends
                    and start chatting!
                  </p>
                </div>
              )}

              {entries.map((entry) => {
                if (entry.type === "system") {
                  return (
                    <div key={entry.data.id} className="system-message">
                      {entry.data.text}
                    </div>
                  );
                }

                const msg = entry.data;
                const isOwn = msg.sender === username;
                return (
                  <div
                    key={msg.id}
                    className={`message ${isOwn ? "own" : "other"}`}
                  >
                    {!isOwn && (
                      <span
                        className="message-avatar"
                        style={{ background: getAvatarColor(msg.sender) }}
                      >
                        {getInitial(msg.sender)}
                      </span>
                    )}
                    <div className="message-bubble">
                      {!isOwn && (
                        <div className="message-sender">{msg.sender}</div>
                      )}
                      <div className="message-text">{msg.text}</div>
                      <div className="message-time">
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {activeTypers.length > 0 && (
                <div className="typing-indicator">
                  <div className="typing-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span>
                    {activeTypers.length === 1
                      ? `${activeTypers[0]} is typing`
                      : `${activeTypers.length} people typing`}
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="message-input-area">
              <div className="message-input-wrapper">
                <textarea
                  ref={textareaRef}
                  id="message-input"
                  className="message-input"
                  placeholder="Type a message…"
                  value={messageText}
                  onChange={(e) => handleTextareaInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  autoFocus
                />
                <button
                  id="btn-send"
                  className="btn-send"
                  onClick={handleSend}
                  disabled={!messageText.trim()}
                  title="Send"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13" />
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                  </svg>
                </button>
              </div>
            </div>
          </main>
        </div>
      )}
    </>
  );
}
