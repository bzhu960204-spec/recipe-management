import { useCallback, useEffect, useRef, useState } from 'react';

type WakeLock = { release: () => Promise<void>; addEventListener: (type: 'release', handler: () => void) => void };

/**
 * Keeps the screen awake while Cook Mode is open. Browsers drop the lock when the tab is
 * backgrounded, so it is re-acquired on visibility change; unsupported browsers degrade silently.
 */
export function useWakeLock(active: boolean) {
  const lockRef = useRef<WakeLock | null>(null);
  const [supported] = useState(() => typeof navigator !== 'undefined' && 'wakeLock' in navigator);
  const [held, setHeld] = useState(false);

  const acquire = useCallback(async () => {
    if (!supported || lockRef.current) return;
    try {
      const request = (navigator as unknown as { wakeLock: { request: (type: 'screen') => Promise<WakeLock> } })
        .wakeLock.request;
      const lock = await request.call((navigator as unknown as { wakeLock: unknown }).wakeLock, 'screen');
      lockRef.current = lock;
      setHeld(true);
      lock.addEventListener('release', () => {
        lockRef.current = null;
        setHeld(false);
      });
    } catch {
      setHeld(false);
    }
  }, [supported]);

  useEffect(() => {
    if (!active) {
      void lockRef.current?.release();
      lockRef.current = null;
      setHeld(false);
      return;
    }

    void acquire();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void acquire();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      void lockRef.current?.release();
      lockRef.current = null;
      setHeld(false);
    };
  }, [active, acquire]);

  return { supported, held };
}
