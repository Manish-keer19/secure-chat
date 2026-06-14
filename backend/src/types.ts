// ═══════════════════════════════════════════════════════════════════
//  Whisper Chat Backend — Type Definitions
// ═══════════════════════════════════════════════════════════════════

/** A single chat message stored in memory. */
export interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  edited?: boolean;
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
  isGroup?: boolean;
}

/** Payload from client: join-room */
export interface JoinRoomPayload {
  roomId: string;
  username: string;
  isGroup?: boolean;
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

// ── Call Interfaces ────────────────────────────────────────────────
export interface CallParticipant {
  socketId: string;
  username: string;
  mediaState: {
    audio: boolean;
    video: boolean;
  };
}

export interface CallState {
  roomId: string;
  callType: "audio" | "video";
  startedAt: number;
  participants: CallParticipant[];
  hasBeenAnswered?: boolean;
}

export interface OfferPayload {
  toSocketId: string;
  offer: any; // WebRTC SDP session description
}

export interface AnswerPayload {
  toSocketId: string;
  answer: any; // WebRTC SDP session description
}

export interface IceCandidatePayload {
  toSocketId: string;
  candidate: any; // WebRTC ICE candidate
}

export interface ToggleMediaPayload {
  audio: boolean;
  video: boolean;
}

// ── Server → Client event map (for type-safe io.emit) ───────────
export interface ServerToClientEvents {
  "message-history": (messages: Message[]) => void;
  "new-message": (message: Message) => void;
  "message-edited": (message: Message) => void;
  "system-message": (msg: SystemMessage) => void;
  "room-users": (users: string[]) => void;
  "user-typing": (username: string) => void;
  "user-stop-typing": (username: string) => void;
  "room-info": (payload: { roomId: string; isGroup: boolean }) => void;
  
  // Call events
  "call-state": (state: CallState | null) => void;
  "participant-joined": (participant: CallParticipant) => void;
  "participant-left": (socketId: string) => void;
  "call-ended": (payload: { reason: "left" | "declined" | "timeout" | "disconnected"; username?: string }) => void;
  "offer": (payload: { fromSocketId: string; offer: any }) => void;
  "answer": (payload: { fromSocketId: string; answer: any }) => void;
  "ice-candidate": (payload: { fromSocketId: string; candidate: any }) => void;
  "participant-media-toggled": (payload: { socketId: string; mediaState: { audio: boolean; video: boolean } }) => void;
  "call-error": (msg: string) => void;
}

// ── Client → Server event map ───────────────────────────────────
export interface ClientToServerEvents {
  "join-room": (payload: JoinRoomPayload) => void;
  "send-message": (payload: SendMessagePayload) => void;
  "edit-message": (payload: { id: string; text: string }) => void;
  "typing": () => void;
  "stop-typing": () => void;

  // Call events
  "start-call": (payload: StartCallPayload) => void;
  "join-call": () => void;
  "leave-call": () => void;
  "offer": (payload: OfferPayload) => void;
  "answer": (payload: AnswerPayload) => void;
  "ice-candidate": (payload: IceCandidatePayload) => void;
  "toggle-media": (payload: ToggleMediaPayload) => void;
}

export interface StartCallPayload {
  callType: "audio" | "video";
}

