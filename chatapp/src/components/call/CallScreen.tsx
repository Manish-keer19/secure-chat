// ═══════════════════════════════════════════════════════════════════
//  CallScreen — Fullscreen calling overlay with Header, Grid, Controls
// ═══════════════════════════════════════════════════════════════════

import { motion } from "framer-motion";
import { useCall } from "../../hooks/useCall";
import { getSocket } from "../../hooks/useSocket";
import CallHeader from "./CallHeader";
import VideoGrid from "./VideoGrid";
import CallControls from "./CallControls";

export default function CallScreen() {
  const {
    callState,
    localStream,
    remoteStreams,
    audioEnabled,
    videoEnabled,
    isSharingScreen,
    leaveCall,
    toggleAudio,
    toggleVideo,
    switchCamera,
    toggleScreenShare,
  } = useCall();

  if (!callState) return null;

  const socket = getSocket();
  const selfSocketId = socket.id || "local";

  // 1. Build local participant object
  const localParticipant = {
    socketId: selfSocketId,
    username: callState.participants.find((p) => p.socketId === selfSocketId)?.username || "You",
    stream: localStream,
    audioEnabled,
    videoEnabled,
    isLocal: true,
  };

  // 2. Build remote participants objects list
  const remoteParticipants = callState.participants
    .filter((p) => p.socketId !== selfSocketId)
    .map((p) => ({
      socketId: p.socketId,
      username: p.username,
      stream: remoteStreams[p.socketId] || null,
      audioEnabled: p.mediaState.audio,
      videoEnabled: p.mediaState.video,
      isLocal: false,
    }));

  const allGridParticipants = [localParticipant, ...remoteParticipants];

  return (
    <motion.div
      className="call-screen-overlay glass-card"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="call-layout-wrapper">
        {/* Header */}
        <CallHeader
          roomId={callState.roomId}
          callType={callState.callType}
          startedAt={callState.startedAt}
          participantCount={allGridParticipants.length}
        />

        {/* Video Grid */}
        <VideoGrid
          participants={allGridParticipants}
          callType={callState.callType}
        />

        {/* Controls Tray */}
        <CallControls
          audioEnabled={audioEnabled}
          videoEnabled={videoEnabled}
          isSharingScreen={isSharingScreen}
          callType={callState.callType}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onSwitchCamera={switchCamera}
          onToggleScreenShare={toggleScreenShare}
          onLeave={leaveCall}
        />
      </div>
    </motion.div>
  );
}
