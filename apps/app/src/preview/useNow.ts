import { useEffect, useState } from 'react';

/** L'instant présent, rafraîchi à intervalle régulier (compte à rebours, ligne « maintenant »). */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
