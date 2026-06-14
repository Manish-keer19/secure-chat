// ═══════════════════════════════════════════════════════════════════
//  Whisper Chat Backend — Call Manager
//  Manages active WebRTC call states in memory.
// ═══════════════════════════════════════════════════════════════════

import type { CallState, CallParticipant } from "./types";
import { log } from "./utils";

class CallManager {
  // Map of roomId -> CallState
  private activeCalls = new Map<string, CallState>();

  /**
   * Start a new call in a room
   */
  startCall(roomId: string, initiatorSocketId: string, username: string, callType: "audio" | "video"): CallState | null {
    if (this.activeCalls.has(roomId)) {
      log.warn(`Call already exists in room ${roomId}`);
      return null;
    }

    const initiator: CallParticipant = {
      socketId: initiatorSocketId,
      username,
      mediaState: {
        audio: true, // Default to true when joining
        video: callType === "video", // Default video to true if video call
      },
    };

    const callState: CallState = {
      roomId,
      callType,
      startedAt: Date.now(),
      participants: [initiator],
    };

    this.activeCalls.set(roomId, callState);
    log.info(`[Call] New ${callType} call started in room "${roomId}" by ${username}`);
    return callState;
  }

  /**
   * Add a participant to an existing call
   */
  joinCall(roomId: string, socketId: string, username: string): { call: CallState | null; error?: string } {
    const call = this.activeCalls.get(roomId);
    if (!call) {
      return { call: null, error: "No active call in this room" };
    }

    // Capped at max 8 participants
    if (call.participants.length >= 8) {
      return { call: null, error: "Call has reached maximum capacity of 8 participants" };
    }

    // Check if duplicate user is already in call
    if (call.participants.some((p) => p.socketId === socketId)) {
      return { call: null, error: "Already in the call" };
    }

    const newParticipant: CallParticipant = {
      socketId,
      username,
      mediaState: {
        audio: true,
        video: call.callType === "video",
      },
    };

    call.participants.push(newParticipant);
    call.hasBeenAnswered = true;
    log.info(`[Call] ${username} joined call in room "${roomId}"`);
    return { call };
  }

  /**
   * Get active call state of a room
   */
  getCall(roomId: string): CallState | null {
    return this.activeCalls.get(roomId) ?? null;
  }

  /**
   * Toggle audio or video status for a participant
   */
  toggleMedia(roomId: string, socketId: string, audio: boolean, video: boolean): CallState | null {
    const call = this.activeCalls.get(roomId);
    if (!call) return null;

    const participant = call.participants.find((p) => p.socketId === socketId);
    if (participant) {
      participant.mediaState.audio = audio;
      participant.mediaState.video = video;
      log.info(`[Call] Media update in room "${roomId}" for ${participant.username}: audio=${audio}, video=${video}`);
      return call;
    }

    return null;
  }

  /**
   * Remove a user from a call. Returns true if the call became empty and was cleaned up.
   */
  leaveCall(roomId: string, socketId: string): { callDeleted: boolean; call: CallState | null } {
    const call = this.activeCalls.get(roomId);
    if (!call) return { callDeleted: false, call: null };

    const originalLength = call.participants.length;
    call.participants = call.participants.filter((p) => p.socketId !== socketId);

    if (call.participants.length === originalLength) {
      // User wasn't in the call
      return { callDeleted: false, call };
    }

    log.info(`[Call] Socket ${socketId} left call in room "${roomId}"`);

    if (call.participants.length === 0 || (call.hasBeenAnswered && call.participants.length <= 1)) {
      this.activeCalls.delete(roomId);
      log.info(`[Call] Call in room "${roomId}" ended (empty or single participant remaining)`);
      return { callDeleted: true, call: null };
    }

    return { callDeleted: false, call };
  }

  /**
   * Check if a user is currently in a call in a room.
   */
  isUserInCall(roomId: string, socketId: string): boolean {
    const call = this.activeCalls.get(roomId);
    if (!call) return false;
    return call.participants.some((p) => p.socketId === socketId);
  }

  /**
   * Remove a user from any active call they are in (on disconnection)
   */
  leaveAnyActiveCall(socketId: string): { roomId: string; callDeleted: boolean; call: CallState | null } | null {
    for (const [roomId, call] of this.activeCalls.entries()) {
      if (call.participants.some((p) => p.socketId === socketId)) {
        const result = this.leaveCall(roomId, socketId);
        return {
          roomId,
          callDeleted: result.callDeleted,
          call: result.call,
        };
      }
    }
    return null;
  }

  /**
   * Force delete all calls (on shutdown)
   */
  destroyAll(): void {
    this.activeCalls.clear();
    log.info("[Call] All active calls cleared");
  }
}

export const callManager = new CallManager();
