import { useRef, useEffect, useState } from "react";

/**
 * Adds native-feeling pull-to-refresh for mobile.
 * Returns { containerRef, isRefreshing }.
 * Attach containerRef to the scrollable container element.
 */
export function usePullToRefresh(onRefresh, threshold = 72) {
  const containerRef = useRef(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(null);
  const pulling = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e) => {
      if (el.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    };

    const onTouchMove = (e) => {
      if (!pulling.current || startY.current === null) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 10 && el.scrollTop === 0) {
        e.preventDefault(); // prevent page scroll
      }
    };

    const onTouchEnd = async (e) => {
      if (!pulling.current || startY.current === null) return;
      const delta = (e.changedTouches[0]?.clientY ?? 0) - startY.current;
      pulling.current = false;
      startY.current = null;
      if (delta > threshold) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [onRefresh, threshold]);

  return { containerRef, isRefreshing };
}