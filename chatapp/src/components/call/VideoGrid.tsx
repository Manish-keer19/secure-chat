// ═══════════════════════════════════════════════════════════════════
//  VideoGrid — Dynamic grid container for multiple callers
// ═══════════════════════════════════════════════════════════════════

import ParticipantTile from "./ParticipantTile";

interface GridParticipant {
  socketId: string;
  username: string;
  stream: MediaStream | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isLocal: boolean;
}

interface VideoGridProps {
  participants: GridParticipant[];
  callType: "audio" | "video";
}

export default function VideoGrid({ participants, callType }: VideoGridProps) {
  const count = participants.length;
  
  // Decide grid class based on participant count
  let gridClass = "grid-1";
  if (count === 2) {
    gridClass = "grid-2";
  } else if (count >= 3 && count <= 4) {
    gridClass = "grid-3-4";
  } else if (count >= 5) {
    gridClass = "grid-5-8";
  }

  return (
    <div className="call-grid-container">
      {/* Performance Warning for Large Mesh Calls */}
      {count >= 5 && (
        <div className="performance-warning-banner" role="alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>Large calls may impact performance. Future SFU support recommended.</span>
        </div>
      )}

      <div className={`video-grid ${gridClass}`}>
        {participants.map((p) => (
          <ParticipantTile
            key={p.socketId}
            username={p.username}
            stream={p.stream}
            audioEnabled={p.audioEnabled}
            videoEnabled={p.videoEnabled}
            isLocal={p.isLocal}
            callType={callType}
          />
        ))}
      </div>
    </div>
  );
}
