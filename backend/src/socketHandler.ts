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
import { callManager } from "./callManager";
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
const callTimeouts = new Map<string, NodeJS.Timeout>();

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

  // Leave active call first if any
  const callResult = callManager.leaveAnyActiveCall(socket.id);
  if (callResult) {
    if (callResult.callDeleted) {
      // Clear timeout if call deleted
      const timeout = callTimeouts.get(roomId);
      if (timeout) {
        clearTimeout(timeout);
        callTimeouts.delete(roomId);
      }
      io.to(roomId).emit("call-ended", { reason: "disconnected", username });
      io.to(roomId).emit("call-state", null);
    } else {
      io.to(roomId).emit("participant-left", socket.id);
      io.to(roomId).emit("call-state", callResult.call);
    }
  }

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

    // Check if there's an active, unanswered call, and if there are no other potential answerers
    const currentCall = callManager.getCall(roomId);
    if (currentCall && !currentCall.hasBeenAnswered) {
      const room = roomManager.get(roomId);
      const usersInRoom = room ? Array.from(room.users.keys()) : [];
      const potentialAnswerers = usersInRoom.filter(id => id !== currentCall.participants[0].socketId);
      if (potentialAnswerers.length === 0) {
        // No one else is in the room to answer the call! Force end it.
        callManager.leaveCall(roomId, currentCall.participants[0].socketId);
        const timeout = callTimeouts.get(roomId);
        if (timeout) {
          clearTimeout(timeout);
          callTimeouts.delete(roomId);
        }
        io.to(roomId).emit("call-ended", { reason: "disconnected", username });
        io.to(roomId).emit("call-state", null);
      }
    }
  } else {
    // Room was deleted, clean up call timeout
    const timeout = callTimeouts.get(roomId);
    if (timeout) {
      clearTimeout(timeout);
      callTimeouts.delete(roomId);
    }
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
      const result = roomManager.addUser(roomId, socket.id, username, payload.isGroup);
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

      // Send room info to joiner
      socket.emit("room-info", {
        roomId,
        isGroup: roomManager.get(roomId)?.isGroup !== false,
      });

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

      // Send current call state of the room to joiner
      const currentCall = callManager.getCall(roomId);
      socket.emit("call-state", currentCall);

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

    // ── edit-message ──────────────────────────────────────────
    socket.on("edit-message", (payload: { id: string; text: string }) => {
      if (!session.roomId || !session.username) return;
      if (!payload || typeof payload !== "object" || !payload.id || typeof payload.text !== "string") return;

      const text = validateMessage(payload.text);
      if (!text) return;

      if (isRateLimited(session)) {
        log.warn(`Rate limited edit: ${session.username} in room ${session.roomId}`);
        return;
      }

      session.lastMessageAt = Date.now();
      session.messageCount++;

      const message = roomManager.editMessage(
        session.roomId,
        payload.id,
        session.username,
        text
      );

      if (message) {
        io.to(session.roomId).emit("message-edited", message);
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

    // ── start-call ─────────────────────────────────────────────
    socket.on("start-call", (payload) => {
      if (!session.roomId || !session.username) {
        socket.emit("call-error", "You must be in a room to start a call");
        return;
      }

      const existingCall = callManager.getCall(session.roomId);
      if (existingCall) {
        socket.emit("call-error", "A call is already active in this room");
        return;
      }

      const callType = payload?.callType === "audio" ? "audio" : "video";
      const call = callManager.startCall(session.roomId, socket.id, session.username, callType);
      if (call) {
        io.to(session.roomId).emit("call-state", call);

        // Schedule unanswered call timeout (30 seconds)
        const roomId = session.roomId;
        const timeout = setTimeout(() => {
          const c = callManager.getCall(roomId);
          if (c && !c.hasBeenAnswered) {
            log.info(`[Call] Timeout unanswered call in room "${roomId}"`);
            callManager.leaveCall(roomId, socket.id); // deletes the call
            callTimeouts.delete(roomId);
            io.to(roomId).emit("call-ended", { reason: "timeout" });
            io.to(roomId).emit("call-state", null);
          }
        }, 30_000);
        callTimeouts.set(roomId, timeout);
      } else {
        socket.emit("call-error", "Failed to start call");
      }
    });

    // ── join-call ──────────────────────────────────────────────
    socket.on("join-call", () => {
      if (!session.roomId || !session.username) {
        socket.emit("call-error", "You must be in a room to join a call");
        return;
      }

      const { call, error } = callManager.joinCall(session.roomId, socket.id, session.username);
      if (error || !call) {
        socket.emit("call-error", error ?? "Failed to join call");
        return;
      }

      // Cancel unanswered call timeout since call is answered
      const timeout = callTimeouts.get(session.roomId);
      if (timeout) {
        clearTimeout(timeout);
        callTimeouts.delete(session.roomId);
      }

      const joinedParticipant = call.participants.find((p) => p.socketId === socket.id);
      if (joinedParticipant) {
        socket.to(session.roomId).emit("participant-joined", joinedParticipant);
      }

      io.to(session.roomId).emit("call-state", call);
    });

    // ── leave-call ─────────────────────────────────────────────
    socket.on("leave-call", () => {
      if (!session.roomId) return;

      const currentCall = callManager.getCall(session.roomId);
      if (currentCall) {
        const isParticipant = currentCall.participants.some(p => p.socketId === socket.id);
        if (!isParticipant && currentCall.participants.length === 1) {
          // A recipient declined the call before joining. Force end the call.
          const initiatorSocketId = currentCall.participants[0].socketId;
          callManager.leaveCall(session.roomId, initiatorSocketId);

          const timeout = callTimeouts.get(session.roomId);
          if (timeout) {
            clearTimeout(timeout);
            callTimeouts.delete(session.roomId);
          }

          io.to(session.roomId).emit("call-ended", { reason: "declined", username: session.username || "User" });
          io.to(session.roomId).emit("call-state", null);
          return;
        }
      }

      const { callDeleted, call } = callManager.leaveCall(session.roomId, socket.id);
      if (callDeleted) {
        const timeout = callTimeouts.get(session.roomId);
        if (timeout) {
          clearTimeout(timeout);
          callTimeouts.delete(session.roomId);
        }
        io.to(session.roomId).emit("call-ended", { reason: "left", username: session.username || "User" });
        io.to(session.roomId).emit("call-state", null);
      } else {
        socket.to(session.roomId).emit("participant-left", socket.id);
        io.to(session.roomId).emit("call-state", call);
      }
    });

    // ── offer ──────────────────────────────────────────────────
    socket.on("offer", (payload) => {
      const { toSocketId, offer } = payload;
      if (!session.roomId || !session.username) return;

      // Validate that target is in the same room
      const targetSession = sessions.get(toSocketId);
      if (!targetSession || targetSession.roomId !== session.roomId) {
        socket.emit("call-error", "Target participant is not in your room");
        return;
      }

      io.to(toSocketId).emit("offer", {
        fromSocketId: socket.id,
        offer,
      });
    });

    // ── answer ─────────────────────────────────────────────────
    socket.on("answer", (payload) => {
      const { toSocketId, answer } = payload;
      if (!session.roomId || !session.username) return;

      // Validate that target is in the same room
      const targetSession = sessions.get(toSocketId);
      if (!targetSession || targetSession.roomId !== session.roomId) {
        socket.emit("call-error", "Target participant is not in your room");
        return;
      }

      io.to(toSocketId).emit("answer", {
        fromSocketId: socket.id,
        answer,
      });
    });

    // ── ice-candidate ──────────────────────────────────────────
    socket.on("ice-candidate", (payload) => {
      const { toSocketId, candidate } = payload;
      if (!session.roomId || !session.username) return;

      // Validate that target is in the same room
      const targetSession = sessions.get(toSocketId);
      if (!targetSession || targetSession.roomId !== session.roomId) {
        socket.emit("call-error", "Target participant is not in your room");
        return;
      }

      io.to(toSocketId).emit("ice-candidate", {
        fromSocketId: socket.id,
        candidate,
      });
    });

    // ── toggle-media ───────────────────────────────────────────
    socket.on("toggle-media", (payload) => {
      if (!session.roomId) return;
      const { audio, video } = payload;

      const call = callManager.toggleMedia(session.roomId, socket.id, audio, video);
      if (call) {
        socket.to(session.roomId).emit("participant-media-toggled", {
          socketId: socket.id,
          mediaState: { audio, video },
        });
      }
    });

    // ── disconnect ────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      log.connection(`Disconnected: ${socket.id} (${reason})`);
      leaveRoom(io, socket, session);
      deleteSession(socket.id);
    });
  });
}
