import { useEffect, useState } from 'react';

/** Heure actuelle, rafraîchie toutes les `intervalMs` (alignée sur la seconde). */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let id: number | undefined;
    const tick = () => setNow(new Date());
    const first = window.setTimeout(
      () => {
        tick();
        id = window.setInterval(tick, intervalMs);
      },
      intervalMs - (Date.now() % Math.min(intervalMs, 1000)),
    );
    return () => {
      window.clearTimeout(first);
      if (id !== undefined) window.clearInterval(id);
    };
  }, [intervalMs]);
  return now;
}
