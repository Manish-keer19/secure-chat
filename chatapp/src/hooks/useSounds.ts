// ═══════════════════════════════════════════════════════════════════
//  useSounds — Message & notification sound effects
// ═══════════════════════════════════════════════════════════════════

import { useCallback, useRef } from "react";

/**
 * Preloads and exposes functions to play:
 *  - `playMessageSound()`   — when the current user sends a message
 *  - `playNotificationSound()` — when a message arrives from another user
 *
 * Uses HTMLAudioElement.cloneNode() to allow overlapping playback.
 * Volumes are intentionally modest (50% send, 70% receive).
 */
export function useSounds() {
  const sendAudioRef = useRef<HTMLAudioElement | null>(null);
  const receiveAudioRef = useRef<HTMLAudioElement | null>(null);

  // Lazy-load audio on first call (avoids issues with browsers
  // blocking audio creation before user interaction)
  const getSendAudio = useCallback(() => {
    if (!sendAudioRef.current) {
      sendAudioRef.current = new Audio("/message.mp3");
      sendAudioRef.current.volume = 0.5;
      sendAudioRef.current.preload = "auto";
    }
    return sendAudioRef.current;
  }, []);

  const getReceiveAudio = useCallback(() => {
    if (!receiveAudioRef.current) {
      receiveAudioRef.current = new Audio("/notificatiion.wav");
      receiveAudioRef.current.volume = 0.7;
      receiveAudioRef.current.preload = "auto";
    }
    return receiveAudioRef.current;
  }, []);

  const playMessageSound = useCallback(() => {
    try {
      const audio = getSendAudio();
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.volume = audio.volume;

      const cleanUp = () => {
        clone.removeEventListener("ended", cleanUp);
        clone.removeEventListener("error", cleanUp);
        clone.src = "";
        clone.load();
      };
      clone.addEventListener("ended", cleanUp);
      clone.addEventListener("error", cleanUp);

      clone.play().catch(() => {
        cleanUp();
      });
    } catch {
      /* Ignore audio errors */
    }
  }, [getSendAudio]);

  const playNotificationSound = useCallback(() => {
    try {
      const audio = getReceiveAudio();
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.volume = audio.volume;

      const cleanUp = () => {
        clone.removeEventListener("ended", cleanUp);
        clone.removeEventListener("error", cleanUp);
        clone.src = "";
        clone.load();
      };
      clone.addEventListener("ended", cleanUp);
      clone.addEventListener("error", cleanUp);

      clone.play().catch(() => {
        cleanUp();
      });
    } catch {
      /* Ignore audio errors */
    }
  }, [getReceiveAudio]);

  return { playMessageSound, playNotificationSound };
}
