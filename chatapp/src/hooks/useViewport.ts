// ═══════════════════════════════════════════════════════════════════
//  useViewport — Mobile keyboard & viewport height management
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useCallback, useRef } from "react";

/**
 * Manages the `--vh` CSS custom property so layouts can use
 * `calc(var(--vh, 1vh) * 100)` instead of `100vh` — which breaks
 * on mobile when the virtual keyboard opens.
 *
 * Also handles:
 * - visualViewport resize/scroll events
 * - Keyboard open/close detection
 * - iOS Safari scroll-into-view offset compensation
 */
export function useViewport() {
  const isKeyboardOpenRef = useRef(false);
  const initialHeightRef = useRef(window.innerHeight);

  const updateViewportHeight = useCallback(() => {
    const vv = window.visualViewport;
    const height = vv ? vv.height : window.innerHeight;
    document.documentElement.style.setProperty("--vh", `${height * 0.01}px`);

    // Detect keyboard state
    const threshold = initialHeightRef.current * 0.75;
    const keyboardOpen = height < threshold;

    if (keyboardOpen !== isKeyboardOpenRef.current) {
      isKeyboardOpenRef.current = keyboardOpen;
      document.documentElement.classList.toggle("keyboard-open", keyboardOpen);
    }

    // Compensate for iOS Safari visual viewport offset
    if (vv && vv.offsetTop > 0) {
      document.documentElement.style.setProperty(
        "--vv-offset",
        `${vv.offsetTop}px`
      );
    } else {
      document.documentElement.style.setProperty("--vv-offset", "0px");
    }
  }, []);

  useEffect(() => {
    initialHeightRef.current = window.innerHeight;
    updateViewportHeight();

    // Throttle to prevent excessive layout recalcs
    let rafId: number;
    const throttledUpdate = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateViewportHeight);
    };

    window.addEventListener("resize", throttledUpdate);

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", throttledUpdate);
      window.visualViewport.addEventListener("scroll", throttledUpdate);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", throttledUpdate);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", throttledUpdate);
        window.visualViewport.removeEventListener("scroll", throttledUpdate);
      }
    };
  }, [updateViewportHeight]);
}
