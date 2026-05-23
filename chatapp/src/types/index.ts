// ═══════════════════════════════════════════════════════════════════
//  Whisper Chat — Type Definitions
// ═══════════════════════════════════════════════════════════════════

export interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

export interface SystemMessage {
  id: string;
  text: string;
  timestamp: number;
}

export type ChatEntry =
  | { type: "message"; data: Message }
  | { type: "system"; data: SystemMessage };

export type GroupPosition = "single" | "first" | "middle" | "last";

export interface GroupedMessageEntry {
  type: "message";
  data: Message;
  groupPosition: GroupPosition;
  showSenderName: boolean;
  showAvatar: boolean;
}

export interface GroupedSystemEntry {
  type: "system";
  data: SystemMessage;
}

export type GroupedEntry = GroupedMessageEntry | GroupedSystemEntry;

export type Screen = "waking" | "join" | "chat";
