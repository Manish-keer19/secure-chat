// ═══════════════════════════════════════════════════════════════════
//  Whisper Chat Frontend — Peer Manager
//  Manages mesh WebRTC peer connections, local SDP offers/answers,
//  ICE candidates, track replacements, and active calls cleanup.
// ═══════════════════════════════════════════════════════════════════

const PEER_CONFIG: RTCConfiguration = {
  iceServers: [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
      ],
    },
  ],
};

export class PeerManager {
  // Map of targetSocketId -> RTCPeerConnection
  private connections = new Map<string, RTCPeerConnection>();
  
  // Track listeners to clean up
  private onIceCandidateCallback: ((targetSocketId: string, candidate: RTCIceCandidate) => void) | null = null;
  private onTrackCallback: ((targetSocketId: string, stream: MediaStream) => void) | null = null;

  constructor(
    onIceCandidate: (targetSocketId: string, candidate: RTCIceCandidate) => void,
    onTrack: (targetSocketId: string, stream: MediaStream) => void
  ) {
    this.onIceCandidateCallback = onIceCandidate;
    this.onTrackCallback = onTrack;
  }

  /**
   * Create and store an RTCPeerConnection for a remote peer
   */
  createPeerConnection(targetSocketId: string, localStream: MediaStream): RTCPeerConnection {
    if (this.connections.has(targetSocketId)) {
      this.cleanupPeer(targetSocketId);
    }

    const pc = new RTCPeerConnection(PEER_CONFIG);

    // Add local tracks to peer connection
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidateCallback) {
        this.onIceCandidateCallback(targetSocketId, event.candidate);
      }
    };

    // Handle incoming remote tracks
    pc.ontrack = (event) => {
      if (this.onTrackCallback && event.streams[0]) {
        this.onTrackCallback(targetSocketId, event.streams[0]);
      }
    };

    // Connection state logging & auto-recovery (ICE Restart if needed)
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      if (state === "failed" || state === "disconnected") {
        console.warn(`ICE connection to ${targetSocketId} failed or disconnected, triggering restart...`);
        // Trigger ICE restart if we are the initiator (offer-sender)
        pc.createOffer({ iceRestart: true })
          .then((offer) => pc.setLocalDescription(offer))
          .catch((err) => console.error(`ICE restart failed for ${targetSocketId}:`, err));
      }
    };

    this.connections.set(targetSocketId, pc);
    return pc;
  }

  /**
   * Generate an SDP offer for a target peer
   */
  async createOffer(targetSocketId: string): Promise<RTCSessionDescriptionInit> {
    const pc = this.connections.get(targetSocketId);
    if (!pc) throw new Error(`Peer connection for ${targetSocketId} does not exist`);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
  }

  /**
   * Handle incoming offer, apply description, and generate SDP answer
   */
  async createAnswer(targetSocketId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    const pc = this.connections.get(targetSocketId);
    if (!pc) throw new Error(`Peer connection for ${targetSocketId} does not exist`);

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  }

  /**
   * Handle incoming remote answer
   */
  async handleRemoteAnswer(targetSocketId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.connections.get(targetSocketId);
    if (!pc) {
      console.warn(`Peer connection for ${targetSocketId} not found to handle remote answer.`);
      return;
    }

    if (pc.signalingState !== "stable") {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  /**
   * Add ICE candidate received from signaling
   */
  async addIceCandidate(targetSocketId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const pc = this.connections.get(targetSocketId);
    if (!pc) {
      console.warn(`Peer connection for ${targetSocketId} not found to add ICE candidate.`);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error(`Error adding ICE candidate for ${targetSocketId}:`, error);
    }
  }

  /**
   * Replace video track for all active peer connections (camera switching/screen share)
   */
  async replaceVideoTrack(newTrack: MediaStreamTrack): Promise<void> {
    for (const [socketId, pc] of this.connections.entries()) {
      const senders = pc.getSenders();
      const videoSender = senders.find((sender) => sender.track?.kind === "video");
      if (videoSender) {
        try {
          await videoSender.replaceTrack(newTrack);
        } catch (error) {
          console.error(`Failed to replace video track for peer ${socketId}:`, error);
        }
      } else {
        // If there's no video sender yet (e.g. upgraded from audio call), add the track
        try {
          pc.addTrack(newTrack);
        } catch (error) {
          console.error(`Failed to add video track for peer ${socketId}:`, error);
        }
      }
    }
  }

  /**
   * Replace audio track for all active peer connections
   */
  async replaceAudioTrack(newTrack: MediaStreamTrack): Promise<void> {
    for (const [socketId, pc] of this.connections.entries()) {
      const senders = pc.getSenders();
      const audioSender = senders.find((sender) => sender.track?.kind === "audio");
      if (audioSender) {
        try {
          await audioSender.replaceTrack(newTrack);
        } catch (error) {
          console.error(`Failed to replace audio track for peer ${socketId}:`, error);
        }
      }
    }
  }

  /**
   * Get all active connections Map
   */
  getConnections(): Map<string, RTCPeerConnection> {
    return this.connections;
  }

  /**
   * Close and delete a single peer connection
   */
  cleanupPeer(targetSocketId: string): void {
    const pc = this.connections.get(targetSocketId);
    if (pc) {
      pc.close();
      this.connections.delete(targetSocketId);
    }
  }

  /**
   * Close and delete all peer connections
   */
  cleanupAll(): void {
    this.connections.forEach((pc) => {
      pc.close();
    });
    this.connections.clear();
  }
}
