// ═══════════════════════════════════════════════════════════════════
//  usePeerConnection — Hook wrapping remote peer connections & errors
// ═══════════════════════════════════════════════════════════════════

import { useCall } from "./useCall";

export function usePeerConnection() {
  const {
    remoteStreams,
    isInCall,
    isConnecting,
    error,
    clearError,
    leaveCall,
    callState,
  } = useCall();

  return {
    remoteStreams,
    isInCall,
    isConnecting,
    error,
    clearError,
    leaveCall,
    callState,
  };
}

export default usePeerConnection;
