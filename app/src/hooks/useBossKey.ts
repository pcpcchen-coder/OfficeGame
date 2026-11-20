import { useEffect, useLayoutEffect, useRef } from 'react';

interface Options {
  onToggle: () => void;
  /** 對話框開著時暫停，讓 Esc 先關對話框 */
  paused?: boolean;
  autoHideOnBlur: boolean;
  onBlurHide: () => void;
}

const DOUBLE_SHIFT_MS = 400;

/** Esc 或連按兩下 Shift 切換老闆鍵 */
export function useBossKey({ onToggle, paused, autoHideOnBlur, onBlurHide }: Options) {
  const lastShift = useRef(0);
  const toggleRef = useRef(onToggle);
  const blurRef = useRef(onBlurHide);
  useLayoutEffect(() => {
    toggleRef.current = onToggle;
    blurRef.current = onBlurHide;
  });

  useEffect(() => {
    if (paused) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        lastShift.current = 0;
        toggleRef.current();
        return;
      }
      if (e.key === 'Shift') {
        if (e.repeat) return;
        const now = performance.now();
        if (now - lastShift.current < DOUBLE_SHIFT_MS) {
          lastShift.current = 0;
          toggleRef.current();
        } else {
          lastShift.current = now;
        }
        return;
      }
      lastShift.current = 0; // 中間按了別的鍵（例如 Shift+字母打大寫），不算連按
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [paused]);

  useEffect(() => {
    if (!autoHideOnBlur) return;
    const onBlur = () => blurRef.current();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') blurRef.current();
    };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [autoHideOnBlur]);
}
