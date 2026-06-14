// ═══════════════════════════════════════════════════════════════════
//  useMedia — Hook abstracting local video and audio controls
// ═══════════════════════════════════════════════════════════════════

import { useCall } from "./useCall";

export function useMedia() {
  const {
    localStream,
    audioEnabled,
    videoEnabled,
    cameraFacing,
    isSharingScreen,
    toggleAudio,
    toggleVideo,
    switchCamera,
    toggleScreenShare,
  } = useCall();

  return {
    localStream,
    audioEnabled,
    videoEnabled,
    cameraFacing,
    isSharingScreen,
    toggleAudio,
    toggleVideo,
    switchCamera,
    toggleScreenShare,
  };
}

export default useMedia;
