// ═══════════════════════════════════════════════════════════════════
//  Whisper Chat Frontend — Media Manager
//  Manages user media devices, streams, track toggles, and switching.
// ═══════════════════════════════════════════════════════════════════

export class MediaManager {
  private localStream: MediaStream | null = null;
  private isSharingScreen = false;
  private cameraFacing: "user" | "environment" = "user";

  /**
   * Request media stream from user devices
   */
  async getStream(callType: "audio" | "video", facingMode: "user" | "environment" = "user"): Promise<MediaStream> {
    this.stopAllTracks();
    this.cameraFacing = facingMode;

    const isMobileDevice = /Mobi|Android/i.test(navigator.userAgent);

    const videoConstraints = callType === "video" 
      ? (isMobileDevice 
          ? {
              width: { ideal: 640 },
              height: { ideal: 480 },
              frameRate: { ideal: 15, max: 24 },
              facingMode: this.cameraFacing,
            }
          : {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 24, max: 24 },
              facingMode: this.cameraFacing,
            })
      : false;

    const constraints: MediaStreamConstraints = {
      audio: true,
      video: videoConstraints,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.localStream = stream;
    this.isSharingScreen = false;
    return stream;
  }

  /**
   * Switch the mobile camera stream (front/back) without breaking connection
   */
  async switchCamera(callType: "audio" | "video"): Promise<{ stream: MediaStream; newTrack: MediaStreamTrack }> {
    if (!this.localStream || callType !== "video") {
      throw new Error("No active video stream to switch");
    }

    const nextFacing = this.cameraFacing === "user" ? "environment" : "user";
    const isMobileDevice = /Mobi|Android/i.test(navigator.userAgent);

    const videoConstraints = isMobileDevice 
      ? {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 15, max: 24 },
          facingMode: nextFacing,
        }
      : {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 24, max: 24 },
          facingMode: nextFacing,
        };

    // Stop existing video track(s)
    const oldVideoTracks = this.localStream.getVideoTracks();
    oldVideoTracks.forEach((track) => {
      track.stop();
      if (this.localStream) {
        this.localStream.removeTrack(track);
      }
    });

    // Request new video track
    const newStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: videoConstraints,
    });

    const newTrack = newStream.getVideoTracks()[0];
    this.localStream.addTrack(newTrack);
    this.cameraFacing = nextFacing;

    return { stream: this.localStream, newTrack };
  }

  /**
   * Toggle audio track status
   */
  setAudioEnabled(enabled: boolean): boolean {
    if (!this.localStream) return false;
    const audioTracks = this.localStream.getAudioTracks();
    audioTracks.forEach((track) => {
      track.enabled = enabled;
    });
    return enabled;
  }

  /**
   * Toggle video track status.
   */
  setVideoEnabled(enabled: boolean): boolean {
    if (!this.localStream) return false;
    const videoTracks = this.localStream.getVideoTracks();
    videoTracks.forEach((track) => {
      track.enabled = enabled;
    });
    return enabled;
  }

  /**
   * Toggle Desktop Screen Share
   */
  async startScreenShare(): Promise<{ stream: MediaStream; track: MediaStreamTrack }> {
    if (!this.localStream) throw new Error("No local stream active");
    if (this.isSharingScreen) throw new Error("Already sharing screen");

    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 15, max: 24 },
      },
      audio: false,
    });

    const screenTrack = screenStream.getVideoTracks()[0];

    // Listen for end sharing button from browser UI
    screenTrack.onended = () => {
      this.stopScreenShare();
    };

    // Remove old video track
    const oldVideoTracks = this.localStream.getVideoTracks();
    oldVideoTracks.forEach((track) => {
      track.stop();
      this.localStream?.removeTrack(track);
    });

    this.localStream.addTrack(screenTrack);
    this.isSharingScreen = true;

    return { stream: this.localStream, track: screenTrack };
  }

  /**
   * Stop screen share and revert back to camera stream
   */
  async stopScreenShare(): Promise<{ stream: MediaStream; newTrack: MediaStreamTrack }> {
    if (!this.isSharingScreen || !this.localStream) {
      throw new Error("Not currently sharing screen");
    }

    // Stop current screen track
    const screenTrack = this.localStream.getVideoTracks()[0];
    if (screenTrack) {
      screenTrack.stop();
      this.localStream.removeTrack(screenTrack);
    }

    // Restore camera
    const isMobileDevice = /Mobi|Android/i.test(navigator.userAgent);
    const videoConstraints = isMobileDevice 
      ? {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 15, max: 24 },
          facingMode: this.cameraFacing,
        }
      : {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 24, max: 24 },
          facingMode: this.cameraFacing,
        };

    const newStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: videoConstraints,
    });

    const newTrack = newStream.getVideoTracks()[0];
    this.localStream.addTrack(newTrack);
    this.isSharingScreen = false;

    return { stream: this.localStream, newTrack };
  }

  /**
   * Clean up all tracks (hang up)
   */
  stopAllTracks(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.onended = null;
        track.stop();
      });
      this.localStream = null;
    }
    this.isSharingScreen = false;
  }

  /**
   * Get active local stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Checks if current camera view is user-facing
   */
  getCameraFacing(): "user" | "environment" {
    return this.cameraFacing;
  }

  /**
   * Checks if desktop screen share is active
   */
  getIsSharingScreen(): boolean {
    return this.isSharingScreen;
  }
}
