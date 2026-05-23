// ═══════════════════════════════════════════════════════════════════
//  Whisper Chat Backend — Entry Point
//  Express + Socket.IO + Graceful Shutdown
// ═══════════════════════════════════════════════════════════════════

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

import type { ServerToClientEvents, ClientToServerEvents } from "./types";
import { registerSocketHandlers } from "./socketHandler";
import { roomManager } from "./roomManager";
import { log } from "./utils";
import {
  SOCKET_PING_TIMEOUT,
  SOCKET_PING_INTERVAL,
  MAX_HTTP_BUFFER_SIZE,
} from "./constants";

// ═══════════════════════════════════════════════════════════════════
//  Configuration
// ═══════════════════════════════════════════════════════════════════
const PORT = parseInt(process.env.PORT || "4000", 10);
const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim())
  : ["http://localhost:5173", "http://localhost:3000"];

// ═══════════════════════════════════════════════════════════════════
//  Express App
// ═══════════════════════════════════════════════════════════════════
const app = express();

// Trust proxy for Render/Railway/Docker/nginx
app.set("trust proxy", 1);

// CORS
app.use(cors({ origin: CORS_ORIGINS }));

// Disable X-Powered-By for security
app.disable("x-powered-by");

// ── Health Check ──────────────────────────────────────────────────
app.get("/", (_req, res) => {
  const stats = roomManager.getStats();
  res.json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
    ...stats,
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB",
  });
});

// ── Readiness Probe ───────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.status(200).send("ok");
});

// ═══════════════════════════════════════════════════════════════════
//  HTTP + Socket.IO Server
// ═══════════════════════════════════════════════════════════════════
const server = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: CORS_ORIGINS,
    methods: ["GET", "POST"],
  },
  // Performance tuning
  pingTimeout: SOCKET_PING_TIMEOUT,
  pingInterval: SOCKET_PING_INTERVAL,
  maxHttpBufferSize: MAX_HTTP_BUFFER_SIZE,
  // Prefer websocket, fall back to polling
  transports: ["websocket", "polling"],
  allowUpgrades: true,
  // Disable per-message deflate for lower CPU
  perMessageDeflate: false,
  // Connection state recovery (short window for reconnects)
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true,
  },
});

// ── Register socket event handlers ────────────────────────────────
registerSocketHandlers(io);

// ── Start room cleanup sweep ──────────────────────────────────────
roomManager.startCleanup();

// ═══════════════════════════════════════════════════════════════════
//  Start Server
// ═══════════════════════════════════════════════════════════════════
server.listen(PORT, () => {
  log.info(`Whisper Chat Server running on http://localhost:${PORT}`);
  log.info(`CORS origins: ${CORS_ORIGINS.join(", ")}`);
  log.info(`Transport: websocket + polling`);
  log.info(`Max payload: ${MAX_HTTP_BUFFER_SIZE / 1000}KB`);
});

// ═══════════════════════════════════════════════════════════════════
//  Graceful Shutdown
// ═══════════════════════════════════════════════════════════════════
function gracefulShutdown(signal: string) {
  log.info(`Received ${signal}. Shutting down gracefully…`);

  // Stop accepting new connections
  io.close(() => {
    log.info("Socket.IO connections closed");
  });

  server.close(() => {
    log.info("HTTP server closed");
    roomManager.destroyAll();
    process.exit(0);
  });

  // Force exit after 10s if something hangs
  setTimeout(() => {
    log.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Prevent unhandled rejection crashes
process.on("unhandledRejection", (reason) => {
  log.error(`Unhandled rejection: ${reason}`);
});

process.on("uncaughtException", (err) => {
  log.error(`Uncaught exception: ${err.message}`);
  process.exit(1);
});
