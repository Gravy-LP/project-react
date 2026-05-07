import { useCallback, useRef, useState } from 'react';

interface Options {
  delay?: number;
  onLongPress?: (e: any) => void;
  onClick?: (e: any) => void;
}

export function useLongPress({ delay = 500, onLongPress, onClick }: Options = {}) {
  const [isLongPressActive, setIsLongPressActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressTriggered = useRef(false);

  const start = useCallback(
    (e: any) => {
      e.persist?.();
      isLongPressTriggered.current = false;
      timerRef.current = setTimeout(() => {
        onLongPress?.(e);
        isLongPressTriggered.current = true;
        setIsLongPressActive(true);
      }, delay);
    },
    [onLongPress, delay]
  );

  const stop = useCallback(
    (e: any) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      
      if (!isLongPressTriggered.current) {
        onClick?.(e);
      }
      
      setIsLongPressActive(false);
    },
    [onClick]
  );

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
  };
}
