# ✦ Whisper Chat — Architecture & Communication Guide ✦

Welcome to **Whisper Chat**, a premium, secure, real-time, room-based chat application. This document details the frontend and backend architectures, the complete list of files, and how real-time socket communication works between them.

---

## 📂 Project Structure

The project is structured as a monorepo containing two primary directories:
1. `backend` — A high-performance Node.js / Express socket server.
2. `chatapp` — A modern, beautiful React / TypeScript user interface.

```
simple_chat/
├── backend/                  # Node.js + Socket.io Server
│   ├── src/
│   │   ├── index.ts          # Server entrypoint & graceful shutdown
│   │   ├── socketHandler.ts  # Socket.io event & rate limits coordinator
│   │   ├── roomManager.ts    # In-memory room & message state manager
│   │   ├── types.ts          # TS Interfaces for events and payloads
│   │   ├── utils.ts          # Input sanitization, IDs, and logging
│   │   └── constants.ts      # Config limits & sweep timer configs
│   ├── tsconfig.json
│   └── package.json
│
└── chatapp/                  # React + Vite Frontend
    ├── src/
    │   ├── main.tsx          # Client entrypoint
    │   ├── App.tsx           # Screen routing & client orchestrator
    │   ├── index.css         # Global design tokens & CSS system
    │   ├── App.css           # Premium layout styling & effects
    │   ├── components/       # Component library
    │   │   ├── WakeScreen.tsx        # Server spin-up animation
    │   │   ├── JoinScreen.tsx        # Room & name selector
    │   │   ├── ChatScreen.tsx        # Main layout manager
    │   │   ├── MessageList.tsx       # Message thread with auto-scroll
    │   │   ├── MessageBubble.tsx     # Message bubbles (Sent/Received)
    │   │   ├── MessageInput.tsx      # Text area with typing triggers
    │   │   ├── Sidebar.tsx           # Active users list drawer
    │   │   ├── AmbientBackground.tsx # Moving glassmorphism gradients
    │   │   ├── TypingIndicator.tsx   # Floating typing indicators
    │   │   └── SystemMessage.tsx     # Leave/Join/Disconnect notifications
    │   ├── hooks/
    │   │   ├── useSocket.ts          # Custom hook for Socket.io events
    │   │   ├── useSounds.ts          # Sound alerts library
    │   │   └── useViewport.ts         # Mobile CSS height variables fixer
    │   ├── utils/
    │   │   └── helpers.ts            # Formatting & UI helpers
    │   └── types/
    │       └── index.ts              # UI screen & entry definitions
    ├── vite.config.ts
    └── package.json
```

---

## 🔗 Code Reference Map

Click directly on any of the source files below to inspect their implementation details:

### Backend Architecture
*   [backend/src/index.ts](file:///c:/MyCode/nestjs/simple_chat/backend/src/index.ts) — App boots, configures Express middlewares (CORS, trust proxy), starts the Socket.IO server, and sets up process shutdown hooks.
*   [backend/src/socketHandler.ts](file:///c:/MyCode/nestjs/simple_chat/backend/src/socketHandler.ts) — Manages connections, applies rate-limiting, and translates incoming client events into state adjustments.
*   [backend/src/roomManager.ts](file:///c:/MyCode/nestjs/simple_chat/backend/src/roomManager.ts) — An in-memory singleton class containing all active rooms, active members, and capped historical logs.
*   [backend/src/types.ts](file:///c:/MyCode/nestjs/simple_chat/backend/src/types.ts) — Type definitions enforcing consistency between client-emitted and server-broadcasted events.
*   [backend/src/constants.ts](file:///c:/MyCode/nestjs/simple_chat/backend/src/constants.ts) — Hard-coded constraints like rate limit window durations, max message lengths, and timeouts.
*   [backend/src/utils.ts](file:///c:/MyCode/nestjs/simple_chat/backend/src/utils.ts) — Sanitization regex engines (e.g., stripping HTML scripts to block XSS) and high-speed ID generators.

### Frontend Componentry
*   [chatapp/src/App.tsx](file:///c:/MyCode/nestjs/simple_chat/chatapp/src/App.tsx) — Main orchestrator showing either `waking`, `join`, or `chat` screen, checking if the server is awake before proceeding.
*   [chatapp/src/hooks/useSocket.ts](file:///c:/MyCode/nestjs/simple_chat/chatapp/src/hooks/useSocket.ts) — Hooks the component state to standard websocket flows (`message-history`, `new-message`, `user-typing`, etc.).
*   [chatapp/src/components/ChatScreen.tsx](file:///c:/MyCode/nestjs/simple_chat/chatapp/src/components/ChatScreen.tsx) — Arranges header, message window list, typing alerts, text fields, and side drawers in a premium layout.

---

## ⚡ How the Chat Works (Communication Flow)

Whisper Chat relies on **bi-directional, real-time message passing** using WebSocket protocol via `socket.io`. Below are detailed visual flows of the key chat lifecycles.

### 1. Waking and Verification Handshake
When the client boots up, it initiates a warming check before letting users join rooms. This ensures server availability (especially when hosted on environments that spin down due to inactivity).

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Web Browser
    participant App as App.tsx
    participant Express as Express Server (index.ts)
    
    User->>App: Opens chat application URL
    App->>App: Render WakeScreen & starts ping loop
    loop Every 3 seconds (up to server response)
        App->>Express: GET / (Http health check request)
        alt Server is Sleeping / Starting
            Express-->>App: (Connection timed out / Refused)
            App->>App: Updates status: "Server is waking up..."
        else Server is Awake
            Express-->>App: 200 OK (Returns active stats: rooms, users)
            App->>App: Updates status: "Server is ready!"
            App->>User: Transition view to JoinScreen
        end
    end
```

---

### 2. Room Joining Flow
To send messages, users must join a room with a **Username** and a **Room ID**. All messages are contextualized by Room IDs.

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant App as App.tsx / useSocket.ts
    participant Socket as Socket.io Client
    participant Srv as Socket.io Server (socketHandler.ts)
    participant RM as RoomManager (roomManager.ts)

    User->>App: Inputs Username & Room ID, clicks "Join"
    App->>Socket: joinRoom(username, roomId)
    Note over Socket, Srv: Establishes raw socket.io connection if offline
    Socket->>Srv: emit("join-room", { username, roomId })
    
    Srv->>Srv: Validate strings & Sanitize inputs (strip tags)
    Srv->>RM: addUser(roomId, socketId, username)
    
    alt Username duplicate or room is full
        RM-->>Srv: Return { ok: false, reason }
        Srv-->>Socket: emit("system-message", { text: reason })
        Socket-->>User: Show connection failure / alert
    else Room is available
        RM-->>Srv: Return { ok: true }
        Srv->>Srv: Associate roomId/username to session map
        Srv->>Socket: join room roomID channel
        
        par Send History to new User
            Srv->>Socket: emit("message-history", Array[Messages])
            Socket-->>User: Populates chat logs with room history
        and Broadcast to Room
            Srv->>Srv: Broadcast to all room members
            Srv-->>Socket: emit("room-users", Array[allUsernames])
            Srv-->>Socket: emit("system-message", { text: "X joined the room" })
            Socket-->>User: Refresh user sidebar and add system message
        end
    end
```

---

### 3. Message Propagation & Rate Limiting
To prevent abuse, the backend implements sliding-window rate limiting.

```mermaid
sequenceDiagram
    autonumber
    actor User as Sender Browser
    participant Input as MessageInput.tsx
    participant Socket as Socket.io Client
    participant Srv as Socket.io Server (socketHandler.ts)
    participant RM as RoomManager (roomManager.ts)
    actor Others as Other Users in Room

    User->>Input: Types "Hello!" and presses Enter / Send
    Input->>Socket: emit("send-message", { text: "Hello!" })
    
    Srv->>Srv: Sanitize input (remove `<script>`, trim spacing)
    
    critical Check Rate Limits
        Srv->>Srv: Compare lastMessageAt (Minimum 200ms interval)
        Srv->>Srv: Check sliding window count (Max 15 msgs / 10s)
    option Allowed
        Srv->>RM: addMessage(roomId, sender, sanitizedText)
        RM->>RM: Append to Room array & crop to last 200 messages
        RM-->>Srv: Return created Message object
        Srv->>Srv: Broadcast to room channel
        par Render for Sender
            Srv-->>Socket: emit("new-message", message)
            Socket-->>User: Append message bubble, play message sound
        and Render for Others
            Srv-->>Others: emit("new-message", message)
            Others-->>Others: Append message bubble, play notification sound
        end
    option Blocked (Rate Limited)
        Srv->>Srv: Silently drop message (or log warning)
    end
```

---

### 4. Real-time Typing Indicators
When users type, indicators flash immediately without saving state on the database.

```mermaid
sequenceDiagram
    autonumber
    actor User as Typing User
    participant Input as MessageInput.tsx
    participant Socket as Socket.io Client
    participant Srv as Socket.io Server
    actor Others as Room members

    User->>Input: Presses a key in text box
    Input->>Socket: emitTyping()
    Socket->>Srv: emit("typing")
    Srv->>Others: broadcast("user-typing", username)
    Others-->>Others: Shows "... user is typing" overlay
    
    alt User stops typing (2 seconds inactivity / message sent)
        Input->>Socket: emit("stop-typing")
        Socket->>Srv: emit("stop-typing")
        Srv->>Others: broadcast("user-stop-typing", username)
        Others-->>Others: Hides "... user is typing" overlay
    end
```

---

### 5. Client Departure & Disconnect Cleanup
When a tab is closed or a user clicks "Leave Room":

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant Socket as Socket.io Client
    participant Srv as Socket.io Server (socketHandler.ts)
    participant RM as RoomManager (roomManager.ts)
    actor Others as Remaining Users in Room

    User->>Socket: click "Leave" / closes tab / disconnects
    Socket->>Srv: Connection closes / disconnect event
    Srv->>RM: removeUser(roomId, socketId)
    
    alt Room still has other users
        RM-->>Srv: Returns false (Room not empty)
        Srv->>Srv: Broadcast updated roster & leaving message
        Srv-->>Others: emit("room-users", newRoster)
        Srv-->>Others: emit("system-message", "User left the room")
    else Room is empty
        RM-->>Srv: Returns true (Room is empty)
        Srv->>RM: delete(roomId)
        Note over RM: Room state is cleared immediately from server RAM
    end
    Srv->>Srv: Delete session registry entry
```

---

## 🔒 Security and Safeguards

### In-Memory Storage
All states (rooms, connected lists, message arrays) are stored strictly in RAM (`roomManager.ts`). No databases are hooked up, ensuring messages disappear forever once a room becomes vacant or the server restarts.

### Sweep Cleanup Daemon
A background sweep job runs periodically on the backend to prevent memory leaks from inactive rooms (e.g. rooms with zero active connections):
*   **Trigger Interval:** Every 5 minutes (`STALE_ROOM_CHECK_INTERVAL_MS`).
*   **Idle Room Threshold:** 30 minutes (`ROOM_INACTIVITY_TIMEOUT_MS`).
*   **Action:** Deletes empty rooms that haven't registered activity during this window.

### Anti-Spam Rate Limits
*   **Minimum Interval:** 200 milliseconds between consecutive messages per socket connection.
*   **Maximum Bandwidth:** 15 messages per 10-second sliding window.
*   **Payload Size Limit:** Cap of 100KB per JSON payload to avoid memory exhaustion attacks.

### XSS Prevention
*   Every incoming username and message passes through input sanitization (`utils.ts`).
*   Cleanses standard HTML tag shapes using regex (`/<[^>]*>/g`) to guarantee text displays as string literals, preventing script injections on the frontend.
