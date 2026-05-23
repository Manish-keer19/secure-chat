// ═══════════════════════════════════════════════════════════════════
//  Whisper Chat — Utility Helpers
// ═══════════════════════════════════════════════════════════════════

import type { ChatEntry, GroupedEntry, GroupedMessageEntry } from "../types";

/** Format a Unix-ms timestamp to HH:MM (locale-aware). */
export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Return the first character of a name, uppercased. */
export function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

// ── Deterministic Avatar Colors ──────────────────────────────────
const AVATAR_COLORS = [
  "linear-gradient(135deg, #a78bfa, #6366f1)",
  "linear-gradient(135deg, #f472b6, #ec4899)",
  "linear-gradient(135deg, #34d399, #059669)",
  "linear-gradient(135deg, #fbbf24, #f59e0b)",
  "linear-gradient(135deg, #60a5fa, #3b82f6)",
  "linear-gradient(135deg, #fb923c, #ea580c)",
  "linear-gradient(135deg, #a3e635, #65a30d)",
  "linear-gradient(135deg, #e879f9, #c026d3)",
] as const;

/** Deterministic gradient string based on username. */
export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── Message Grouping ─────────────────────────────────────────────
const GROUP_TIME_THRESHOLD = 300_000; // 5 minutes

/**
 * Takes a flat list of ChatEntry items and annotates each message
 * with its group position (single / first / middle / last),
 * whether to show the sender name, and whether to show the avatar.
 */
export function groupEntries(entries: ChatEntry[]): GroupedEntry[] {
  return entries.map((entry, index) => {
    if (entry.type !== "message") {
      return entry as GroupedEntry;
    }

    const currentMsg = entry.data;
    const prevEntry = entries[index - 1];
    const nextEntry = entries[index + 1];

    const isPrevSame =
      prevEntry?.type === "message" &&
      prevEntry.data.sender === currentMsg.sender;
    const isNextSame =
      nextEntry?.type === "message" &&
      nextEntry.data.sender === currentMsg.sender;

    const timeDiffPrev =
      prevEntry?.type === "message"
        ? Math.abs(currentMsg.timestamp - prevEntry.data.timestamp) <
          GROUP_TIME_THRESHOLD
        : false;
    const timeDiffNext =
      nextEntry?.type === "message"
        ? Math.abs(nextEntry.data.timestamp - currentMsg.timestamp) <
          GROUP_TIME_THRESHOLD
        : false;

    const groupWithPrev = isPrevSame && timeDiffPrev;
    const groupWithNext = isNextSame && timeDiffNext;

    let position: GroupedMessageEntry["groupPosition"] = "single";
    if (groupWithPrev && groupWithNext) position = "middle";
    else if (groupWithPrev && !groupWithNext) position = "last";
    else if (!groupWithPrev && groupWithNext) position = "first";

    return {
      ...entry,
      groupPosition: position,
      showSenderName: !groupWithPrev,
      showAvatar: !groupWithNext,
    } as GroupedMessageEntry;
  });
}
