// ═══════════════════════════════════════════════════════════════════
//  Whisper Chat Backend — Constants
//  Single source of truth for all tunables.
// ═══════════════════════════════════════════════════════════════════

/** Maximum messages retained per room. Oldest are discarded first. */
export const MAX_MESSAGES_PER_ROOM = 200;

/** Maximum users allowed in a single room. */
export const MAX_USERS_PER_ROOM = 50;

/** Maximum length of a single message (characters). */
export const MAX_MESSAGE_LENGTH = 2000;

/** Maximum length of username. */
export const MAX_USERNAME_LENGTH = 24;

/** Maximum length of room ID. */
export const MAX_ROOM_ID_LENGTH = 32;

/** Rate limit: max messages per window per socket. */
export const RATE_LIMIT_MAX_MESSAGES = 15;

/** Rate limit: window duration in ms. */
export const RATE_LIMIT_WINDOW_MS = 10_000;

/** Minimum interval between messages from same socket (ms). */
export const MIN_MESSAGE_INTERVAL_MS = 200;

/** Room inactivity timeout — rooms with no activity are cleaned up (ms). */
export const ROOM_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/** Interval at which stale rooms are checked (ms). */
export const STALE_ROOM_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/** Socket.IO ping timeout (ms). */
export const SOCKET_PING_TIMEOUT = 25_000;

/** Socket.IO ping interval (ms). */
export const SOCKET_PING_INTERVAL = 15_000;

/** Maximum payload size from client (bytes). */
export const MAX_HTTP_BUFFER_SIZE = 1e5; // 100KB
