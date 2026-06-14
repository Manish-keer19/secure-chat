// ═══════════════════════════════════════════════════════════════════
//  Whisper Chat Frontend — Call Types
// ═══════════════════════════════════════════════════════════════════

export interface CallParticipant {
  socketId: string;
  username: string;
  mediaState: {
    audio: boolean;
    video: boolean;
  };
}

export interface CallState {
  roomId: string;
  callType: "audio" | "video";
  startedAt: number;
  participants: CallParticipant[];
  hasBeenAnswered?: boolean;
}

export interface OfferPayload {
  toSocketId: string;
  offer: RTCSessionDescriptionInit;
}

export interface AnswerPayload {
  toSocketId: string;
  answer: RTCSessionDescriptionInit;
}

export interface IceCandidatePayload {
  toSocketId: string;
  candidate: RTCIceCandidateInit;
}

export interface ToggleMediaPayload {
  audio: boolean;
  video: boolean;
}
