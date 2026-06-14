// ═══════════════════════════════════════════════════════════════════
//  useSocket — Socket.io connection & event management
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import type { Message, SystemMessage, ChatEntry } from "../types";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: false });
  }
  return socket;
}

export { SOCKET_URL };

interface UseSocketReturn {
  entries: ChatEntry[];
  users: string[];
  typingUsers: Set<string>;
  isConnected: boolean;
  isConnecting: boolean;
  isGroupRoom: boolean;
  joinRoom: (username: string, roomId: string, isGroup?: boolean) => Promise<boolean>;
  leaveRoom: () => void;
  sendMessage: (text: string) => void;
  editMessage: (id: string, text: string) => void;
  emitTyping: () => void;
}

/**
 * Encapsulates all socket.io logic — connection lifecycle,
 * room join/leave, message sending, typing indicators, and
 * live user list.
 *
 * @param username  Current user's display name
 * @param onNewMessage Callback fired when a message from *another* user arrives
 */
export function useSocket(
  username: string,
  onNewMessage?: (msg: Message) => void,
): UseSocketReturn {
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isGroupRoom, setIsGroupRoom] = useState(true);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernameRef = useRef(username);
  const onNewMessageRef = useRef(onNewMessage);
  const isLoadingHistoryRef = useRef(false);

  // Keep refs in sync
  usernameRef.current = username;
  onNewMessageRef.current = onNewMessage;

  // ── Socket event wiring ──────────────────────────────────────
  useEffect(() => {
    const s = getSocket();

    setIsConnected(s.connected);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => {
      setIsConnected(false);
      setEntries((prev) => [
        ...prev,
        {
          type: "system",
          data: {
            id: "dc-" + Date.now(),
            text: "Connection lost. Reconnecting…",
            timestamp: Date.now(),
          },
        },
      ]);
    };

    const onMessageHistory = (messages: Message[]) => {
      isLoadingHistoryRef.current = true;
      setEntries(messages.map((m) => ({ type: "message", data: m })));
      // Reset after a tick so subsequent new-message events trigger sounds
      if (historyTimeoutRef.current) {
        clearTimeout(historyTimeoutRef.current);
      }
      historyTimeoutRef.current = setTimeout(() => {
        isLoadingHistoryRef.current = false;
        historyTimeoutRef.current = null;
      }, 500);
    };

    const onNewMsg = (message: Message) => {
      setEntries((prev) => [...prev, { type: "message", data: message }]);
      // Notify parent only for messages from others & not during history load
      if (
        message.sender !== usernameRef.current &&
        !isLoadingHistoryRef.current
      ) {
        onNewMessageRef.current?.(message);
      }
    };

    const onMsgEdited = (editedMsg: Message) => {
      setEntries((prev) =>
        prev.map((entry) => {
          if (entry.type === "message" && entry.data.id === editedMsg.id) {
            return { type: "message", data: editedMsg };
          }
          return entry;
        })
      );
    };

    const onSystemMsg = (msg: SystemMessage) => {
      setEntries((prev) => [...prev, { type: "system", data: msg }]);
    };

    const onRoomUsers = (userList: string[]) => {
      setUsers(userList);
    };

    const onUserTyping = (user: string) => {
      setTypingUsers((prev) => new Set(prev).add(user));
    };

    const onUserStopTyping = (user: string) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(user);
        return next;
      });
    };

    const onRoomInfo = (payload: { roomId: string; isGroup: boolean }) => {
      setIsGroupRoom(payload.isGroup);
    };

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("message-history", onMessageHistory);
    s.on("new-message", onNewMsg);
    s.on("message-edited", onMsgEdited);
    s.on("system-message", onSystemMsg);
    s.on("room-users", onRoomUsers);
    s.on("user-typing", onUserTyping);
    s.on("user-stop-typing", onUserStopTyping);
    s.on("room-info", onRoomInfo);

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("message-history", onMessageHistory);
      s.off("new-message", onNewMsg);
      s.off("message-edited", onMsgEdited);
      s.off("system-message", onSystemMsg);
      s.off("room-users", onRoomUsers);
      s.off("user-typing", onUserTyping);
      s.off("user-stop-typing", onUserStopTyping);
      s.off("room-info", onRoomInfo);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (historyTimeoutRef.current) {
        clearTimeout(historyTimeoutRef.current);
        historyTimeoutRef.current = null;
      }
    };
  }, []);

  // ── Actions ──────────────────────────────────────────────────
  const joinRoom = useCallback(
    (user: string, room: string, isGroup?: boolean): Promise<boolean> => {
      return new Promise((resolve) => {
        setIsConnecting(true);
        const s = getSocket();

        const doJoin = () => {
          s.emit("join-room", { roomId: room, username: user, isGroup });
          setIsConnecting(false);
          resolve(true);
        };

        if (!s.connected) {
          s.connect();
          s.once("connect", doJoin);
          s.once("connect_error", () => {
            setIsConnecting(false);
            resolve(false);
          });
        } else {
          doJoin();
        }
      });
    },
    [],
  );

  const leaveRoom = useCallback(() => {
    const s = getSocket();
    s.disconnect();
    socket = null;
    setEntries([]);
    setUsers([]);
    setTypingUsers(new Set());
  }, []);

  const sendMessage = useCallback((text: string) => {
    const s = getSocket();
    s.emit("send-message", { text });
    s.emit("stop-typing");
  }, []);

  const editMessage = useCallback((id: string, text: string) => {
    const s = getSocket();
    s.emit("edit-message", { id, text });
  }, []);

  const emitTyping = useCallback(() => {
    const s = getSocket();
    s.emit("typing");

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      s.emit("stop-typing");
    }, 2000);
  }, []);

  return {
    entries,
    users,
    typingUsers,
    isConnected,
    isConnecting,
    isGroupRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    editMessage,
    emitTyping,
  };
}
