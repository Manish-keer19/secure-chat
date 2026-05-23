// ═══════════════════════════════════════════════════════════════════
//  Whisper Chat Backend — Utility Functions
// ═══════════════════════════════════════════════════════════════════

import { MAX_MESSAGE_LENGTH, MAX_USERNAME_LENGTH, MAX_ROOM_ID_LENGTH } from "./constants";

// ── ID Generation ────────────────────────────────────────────────
// Fast, collision-resistant IDs without crypto overhead.
let idCounter = 0;

export function generateId(): string {
  return (
    Math.random().toString(36).substring(2, 8) +
    (++idCounter).toString(36) +
    Date.now().toString(36)
  );
}

// ── Input Sanitization ───────────────────────────────────────────
// Strips HTML/script tags to prevent XSS when messages are rendered.
const HTML_TAG_REGEX = /<[^>]*>/g;
const MULTI_SPACE_REGEX = /\s{2,}/g;

export function sanitize(input: string): string {
  return input
    .replace(HTML_TAG_REGEX, "")    // Strip HTML tags
    .replace(MULTI_SPACE_REGEX, " ") // Collapse whitespace runs
    .trim();
}

// ── Input Validation ─────────────────────────────────────────────
export function validateMessage(text: unknown): string | null {
  if (typeof text !== "string") return null;
  const cleaned = sanitize(text);
  if (cleaned.length === 0) return null;
  if (cleaned.length > MAX_MESSAGE_LENGTH) return null;
  return cleaned;
}

export function validateUsername(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const cleaned = sanitize(name);
  if (cleaned.length === 0 || cleaned.length > MAX_USERNAME_LENGTH) return null;
  return cleaned;
}

export function validateRoomId(id: unknown): string | null {
  if (typeof id !== "string") return null;
  const cleaned = id.trim();
  if (cleaned.length === 0 || cleaned.length > MAX_ROOM_ID_LENGTH) return null;
  // Allow only alphanumeric, hyphens, underscores
  if (!/^[\w-]+$/.test(cleaned)) return null;
  return cleaned;
}

// ── Logging ──────────────────────────────────────────────────────
const isDev = process.env.NODE_ENV !== "production";

function timestamp(): string {
  return new Date().toISOString().substring(11, 23); // HH:MM:SS.mmm
}

export const log = {
  info: (msg: string) => {
    console.log(`${isDev ? `[${timestamp()}]` : ""} ✦ ${msg}`);
  },
  warn: (msg: string) => {
    console.warn(`${isDev ? `[${timestamp()}]` : ""} ⚠ ${msg}`);
  },
  error: (msg: string) => {
    console.error(`${isDev ? `[${timestamp()}]` : ""} ✕ ${msg}`);
  },
  connection: (msg: string) => {
    if (isDev) console.log(`  [${timestamp()}] → ${msg}`);
  },
};
