import { useState, TouchEvent } from 'react';

interface SwipeConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}

export function useSwipe(config: SwipeConfig) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const threshold = config.threshold ?? 50;

  const onTouchStart = (e: TouchEvent) => {
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (!touchStart) return;

    const xDiff = touchStart.x - e.changedTouches[0].clientX;
    const yDiff = touchStart.y - e.changedTouches[0].clientY;

    const isHorizontal = Math.abs(xDiff) > Math.abs(yDiff);

    if (isHorizontal) {
      if (Math.abs(xDiff) > threshold) {
        if (xDiff > 0) {
          config.onSwipeLeft?.();
        } else {
          config.onSwipeRight?.();
        }
      }
    } else {
      if (Math.abs(yDiff) > threshold) {
        if (yDiff > 0) {
          config.onSwipeUp?.();
        } else {
          config.onSwipeDown?.();
        }
      }
    }

    setTouchStart(null);
  };

  return { onTouchStart, onTouchEnd };
}
