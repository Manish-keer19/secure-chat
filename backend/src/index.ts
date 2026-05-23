import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const server = createServer(app);

// ─── ENV ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim())
  : ["http://localhost:5173", "http://localhost:3000"];

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGINS,
    methods: ["GET", "POST"],
  },
});

// ─── In-Memory Store ───────────────────────────────────────────────
interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

interface Room {
  id: string;
  users: Map<string, string>; // socketId -> username
  messages: Message[];
}

const rooms = new Map<string, Room>();

// ─── Helper ────────────────────────────────────────────────────────
function getOrCreateRoom(roomId: string): Room {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      users: new Map(),
      messages: [],
    });
  }
  return rooms.get(roomId)!;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

// ─── Socket Events ─────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`✦ Connected: ${socket.id}`);

  let currentRoom: string | null = null;
  let currentUsername: string | null = null;

  // Join a room
  socket.on("join-room", ({ roomId, username }: { roomId: string; username: string }) => {
    // Leave previous room if any
    if (currentRoom) {
      socket.leave(currentRoom);
      const prevRoom = rooms.get(currentRoom);
      if (prevRoom) {
        prevRoom.users.delete(socket.id);
        io.to(currentRoom).emit("room-users", Array.from(prevRoom.users.values()));
        io.to(currentRoom).emit("system-message", {
          id: generateId(),
          text: `${currentUsername} left the room`,
          timestamp: Date.now(),
        });
      }
    }

    currentRoom = roomId;
    currentUsername = username;

    const room = getOrCreateRoom(roomId);
    room.users.set(socket.id, username);
    socket.join(roomId);

    // Send existing messages to the joining user
    socket.emit("message-history", room.messages);

    // Notify room of new user
    io.to(roomId).emit("room-users", Array.from(room.users.values()));
    io.to(roomId).emit("system-message", {
      id: generateId(),
      text: `${username} joined the room`,
      timestamp: Date.now(),
    });

    console.log(`  → ${username} joined room ${roomId} (${room.users.size} users)`);
  });

  // Send a message
  socket.on("send-message", ({ text }: { text: string }) => {
    if (!currentRoom || !currentUsername) return;

    const room = rooms.get(currentRoom);
    if (!room) return;

    const message: Message = {
      id: generateId(),
      sender: currentUsername,
      text,
      timestamp: Date.now(),
    };

    room.messages.push(message);

    // Cap messages at 200 to prevent unbounded memory growth
    if (room.messages.length > 200) {
      room.messages = room.messages.slice(-200);
    }

    io.to(currentRoom).emit("new-message", message);
  });

  // Typing indicator
  socket.on("typing", () => {
    if (!currentRoom || !currentUsername) return;
    socket.to(currentRoom).emit("user-typing", currentUsername);
  });

  socket.on("stop-typing", () => {
    if (!currentRoom || !currentUsername) return;
    socket.to(currentRoom).emit("user-stop-typing", currentUsername);
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log(`✦ Disconnected: ${socket.id}`);
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.users.delete(socket.id);
        io.to(currentRoom).emit("room-users", Array.from(room.users.values()));
        io.to(currentRoom).emit("system-message", {
          id: generateId(),
          text: `${currentUsername} left the room`,
          timestamp: Date.now(),
        });

        // Clean up empty rooms
        if (room.users.size === 0) {
          rooms.delete(currentRoom);
          console.log(`  ✕ Room ${currentRoom} deleted (empty)`);
        }
      }
    }
  });
});

// ─── Health Check ──────────────────────────────────────────────────
app.use(cors({ origin: CORS_ORIGINS }));
app.get("/", (_req, res) => {
  res.json({ status: "ok", rooms: rooms.size });
});

// ─── Start ─────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n🚀 Chat server running on http://localhost:${PORT}`);
  console.log(`   CORS origins: ${CORS_ORIGINS.join(", ")}\n`);
});