// ═══════════════════════════════════════════════════════════════════
//  Whisper Chat Backend — Room Manager
//  Singleton that manages all room state in memory.
// ═══════════════════════════════════════════════════════════════════

import type { Room, Message } from "./types";
import {
  MAX_MESSAGES_PER_ROOM,
  MAX_USERS_PER_ROOM,
  ROOM_INACTIVITY_TIMEOUT_MS,
  STALE_ROOM_CHECK_INTERVAL_MS,
} from "./constants";
import { generateId, log } from "./utils";

class RoomManager {
  private rooms = new Map<string, Room>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  // ── Lifecycle ───────────────────────────────────────────────
  /** Start the periodic stale-room cleanup sweep. */
  startCleanup(): void {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => {
      this.sweepStaleRooms();
    }, STALE_ROOM_CHECK_INTERVAL_MS);

    // Don't prevent Node from exiting
    if (this.cleanupTimer.unref) this.cleanupTimer.unref();
  }

  /** Stop cleanup timer (for graceful shutdown). */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /** Destroy all rooms (for graceful shutdown). */
  destroyAll(): void {
    this.stopCleanup();
    this.rooms.clear();
    log.info("All rooms destroyed");
  }

  // ── Room Operations ─────────────────────────────────────────
  /** Get an existing room or create a new one. */
  getOrCreate(roomId: string): Room {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        users: new Map(),
        messages: [],
        lastActivity: Date.now(),
      };
      this.rooms.set(roomId, room);
      log.info(`Room "${roomId}" created`);
    }
    return room;
  }

  /** Get a room if it exists, or null. */
  get(roomId: string): Room | null {
    return this.rooms.get(roomId) ?? null;
  }

  /** Delete a room. */
  delete(roomId: string): void {
    this.rooms.delete(roomId);
    log.info(`Room "${roomId}" deleted (empty)`);
  }

  /** Touch room to update last activity. */
  touch(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) room.lastActivity = Date.now();
  }

  // ── User Operations ─────────────────────────────────────────
  /** Add a user to a room. Returns false if room is full or username is taken. */
  addUser(
    roomId: string,
    socketId: string,
    username: string,
  ): { ok: boolean; reason?: string } {
    const room = this.getOrCreate(roomId);

    // Check capacity
    if (room.users.size >= MAX_USERS_PER_ROOM) {
      return { ok: false, reason: "Room is full" };
    }

    // Check duplicate username in same room
    for (const existingName of room.users.values()) {
      if (existingName.toLowerCase() === username.toLowerCase()) {
        return { ok: false, reason: "Username already taken in this room" };
      }
    }

    room.users.set(socketId, username);
    room.lastActivity = Date.now();
    return { ok: true };
  }

  /** Remove a user from a room. Returns true if room became empty. */
  removeUser(roomId: string, socketId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.users.delete(socketId);
    room.lastActivity = Date.now();

    if (room.users.size === 0) {
      this.delete(roomId);
      return true;
    }
    return false;
  }

  /** Get sorted list of usernames in a room. */
  getUserList(roomId: string): string[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.users.values());
  }

  // ── Message Operations ──────────────────────────────────────
  /** Add a message to a room, enforcing the cap. */
  addMessage(roomId: string, sender: string, text: string): Message | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const message: Message = {
      id: generateId(),
      sender,
      text,
      timestamp: Date.now(),
    };

    room.messages.push(message);
    room.lastActivity = Date.now();

    // Enforce cap — splice is faster than slice for removing from front
    if (room.messages.length > MAX_MESSAGES_PER_ROOM) {
      const excess = room.messages.length - MAX_MESSAGES_PER_ROOM;
      room.messages.splice(0, excess);
    }

    return message;
  }

  /** Get message history for a room. */
  getMessages(roomId: string): Message[] {
    return this.rooms.get(roomId)?.messages ?? [];
  }

  // ── Cleanup ─────────────────────────────────────────────────
  /** Remove rooms with no users that have been inactive. */
  private sweepStaleRooms(): void {
    const now = Date.now();
    let swept = 0;

    for (const [id, room] of this.rooms) {
      if (
        room.users.size === 0 &&
        now - room.lastActivity > ROOM_INACTIVITY_TIMEOUT_MS
      ) {
        this.rooms.delete(id);
        swept++;
      }
    }

    if (swept > 0) {
      log.info(
        `Swept ${swept} stale room(s). Active rooms: ${this.rooms.size}`,
      );
    }
  }

  // ── Stats ───────────────────────────────────────────────────
  /** Get current stats for health endpoint. */
  getStats(): { rooms: number; users: number; messages: number } {
    let users = 0;
    let messages = 0;
    for (const room of this.rooms.values()) {
      users += room.users.size;
      messages += room.messages.length;
    }
    return { rooms: this.rooms.size, users, messages };
  }
}

// Singleton export
export const roomManager = new RoomManager();
