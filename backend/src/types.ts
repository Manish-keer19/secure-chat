// ═══════════════════════════════════════════════════════════════════
//  Whisper Chat Backend — Type Definitions
// ═══════════════════════════════════════════════════════════════════

/** A single chat message stored in memory. */
export interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

/** A system notification (join/leave/disconnect). */
export interface SystemMessage {
  id: string;
  text: string;
  timestamp: number;
}

/** In-memory room state. */
export interface Room {
  id: string;
  /** socketId → username */
  users: Map<string, string>;
  /** Capped message history */
  messages: Message[];
  /** Last activity timestamp for stale room cleanup */
  lastActivity: number;
}

/** Payload from client: join-room */
export interface JoinRoomPayload {
  roomId: string;
  username: string;
}

/** Payload from client: send-message */
export interface SendMessagePayload {
  text: string;
}

/** Per-socket session state */
export interface SocketSession {
  roomId: string | null;
  username: string | null;
  /** Timestamp of last message (for rate limiting) */
  lastMessageAt: number;
  /** Count of messages in current rate window */
  messageCount: number;
  /** Rate window start */
  rateWindowStart: number;
}

// ── Server → Client event map (for type-safe io.emit) ───────────
export interface ServerToClientEvents {
  "message-history": (messages: Message[]) => void;
  "new-message": (message: Message) => void;
  "system-message": (msg: SystemMessage) => void;
  "room-users": (users: string[]) => void;
  "user-typing": (username: string) => void;
  "user-stop-typing": (username: string) => void;
}

// ── Client → Server event map ───────────────────────────────────
export interface ClientToServerEvents {
  "join-room": (payload: JoinRoomPayload) => void;
  "send-message": (payload: SendMessagePayload) => void;
  "typing": () => void;
  "stop-typing": () => void;
}
