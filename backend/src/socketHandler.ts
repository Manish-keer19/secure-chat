// ═══════════════════════════════════════════════════════════════════
//  Whisper Chat Backend — Socket Handler
//  All socket.io event handling, per-socket session state,
//  rate limiting, and input validation.
// ═══════════════════════════════════════════════════════════════════

import type { Server, Socket } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  SocketSession,
  JoinRoomPayload,
  SendMessagePayload,
} from "./types";
import { roomManager } from "./roomManager";
import {
  generateId,
  validateMessage,
  validateUsername,
  validateRoomId,
  log,
} from "./utils";
import {
  RATE_LIMIT_MAX_MESSAGES,
  RATE_LIMIT_WINDOW_MS,
  MIN_MESSAGE_INTERVAL_MS,
} from "./constants";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// ── Per-socket session store ──────────────────────────────────────
const sessions = new Map<string, SocketSession>();

function getSession(socketId: string): SocketSession {
  let session = sessions.get(socketId);
  if (!session) {
    session = {
      roomId: null,
      username: null,
      lastMessageAt: 0,
      messageCount: 0,
      rateWindowStart: Date.now(),
    };
    sessions.set(socketId, session);
  }
  return session;
}

function deleteSession(socketId: string): void {
  sessions.delete(socketId);
}

// ── Rate Limiter ──────────────────────────────────────────────────
function isRateLimited(session: SocketSession): boolean {
  const now = Date.now();

  // Too fast (spam)
  if (now - session.lastMessageAt < MIN_MESSAGE_INTERVAL_MS) {
    return true;
  }

  // Sliding window
  if (now - session.rateWindowStart > RATE_LIMIT_WINDOW_MS) {
    session.rateWindowStart = now;
    session.messageCount = 0;
  }

  if (session.messageCount >= RATE_LIMIT_MAX_MESSAGES) {
    return true;
  }

  return false;
}

// ── Helper: Leave Room ────────────────────────────────────────────
function leaveRoom(io: TypedServer, socket: TypedSocket, session: SocketSession): void {
  if (!session.roomId || !session.username) return;

  const { roomId, username } = session;

  socket.leave(roomId);
  const roomDeleted = roomManager.removeUser(roomId, socket.id);

  if (!roomDeleted) {
    // Room still has users — notify them
    io.to(roomId).emit("room-users", roomManager.getUserList(roomId));
    io.to(roomId).emit("system-message", {
      id: generateId(),
      text: `${username} left the room`,
      timestamp: Date.now(),
    });
  }

  session.roomId = null;
  session.username = null;
  log.connection(`${username} left room ${roomId}`);
}

// ═══════════════════════════════════════════════════════════════════
//  Register Socket Handlers
// ═══════════════════════════════════════════════════════════════════
export function registerSocketHandlers(io: TypedServer): void {
  io.on("connection", (socket: TypedSocket) => {
    const session = getSession(socket.id);
    log.connection(`Connected: ${socket.id}`);

    // ── join-room ─────────────────────────────────────────────
    socket.on("join-room", (payload: JoinRoomPayload) => {
      // Validate payload
      if (!payload || typeof payload !== "object") return;

      const username = validateUsername(payload.username);
      const roomId = validateRoomId(payload.roomId);

      if (!username || !roomId) {
        log.warn(`Invalid join payload from ${socket.id}`);
        return;
      }

      // Leave previous room if any
      leaveRoom(io, socket, session);

      // Try to join new room
      const result = roomManager.addUser(roomId, socket.id, username);
      if (!result.ok) {
        socket.emit("system-message", {
          id: generateId(),
          text: result.reason ?? "Cannot join room",
          timestamp: Date.now(),
        });
        log.warn(`Join denied for ${username} → ${roomId}: ${result.reason}`);
        return;
      }

      // Update session
      session.roomId = roomId;
      session.username = username;

      socket.join(roomId);

      // Send history to joiner
      socket.emit("message-history", roomManager.getMessages(roomId));

      // Notify room
      const userList = roomManager.getUserList(roomId);
      io.to(roomId).emit("room-users", userList);
      io.to(roomId).emit("system-message", {
        id: generateId(),
        text: `${username} joined the room`,
        timestamp: Date.now(),
      });

      log.info(`${username} → room "${roomId}" (${userList.length} users)`);
    });

    // ── send-message ──────────────────────────────────────────
    socket.on("send-message", (payload: SendMessagePayload) => {
      if (!session.roomId || !session.username) return;
      if (!payload || typeof payload !== "object") return;

      const text = validateMessage(payload.text);
      if (!text) return;

      // Rate limiting
      if (isRateLimited(session)) {
        log.warn(`Rate limited: ${session.username} in room ${session.roomId}`);
        return;
      }

      session.lastMessageAt = Date.now();
      session.messageCount++;

      const message = roomManager.addMessage(session.roomId, session.username, text);
      if (message) {
        io.to(session.roomId).emit("new-message", message);
      }
    });

    // ── typing ────────────────────────────────────────────────
    socket.on("typing", () => {
      if (!session.roomId || !session.username) return;
      // Broadcast to others only (not back to sender)
      socket.to(session.roomId).emit("user-typing", session.username);
    });

    // ── stop-typing ───────────────────────────────────────────
    socket.on("stop-typing", () => {
      if (!session.roomId || !session.username) return;
      socket.to(session.roomId).emit("user-stop-typing", session.username);
    });

    // ── disconnect ────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      log.connection(`Disconnected: ${socket.id} (${reason})`);
      leaveRoom(io, socket, session);
      deleteSession(socket.id);
    });
  });
}
