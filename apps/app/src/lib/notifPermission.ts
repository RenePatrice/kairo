import { useNotifications } from '@kairo/platform';
import { useCallback } from 'react';
import { useUi } from '../store';

/**
 * Demande l'autorisation des notifications, en contexte (premier créneau avec rappel, fin de
 * l'accueil, réglage « Rappels »), et seulement si elle n'a jamais été donnée ni refusée.
 * Sans elle, Android n'affiche aucun rappel : il faut la demander avant le premier.
 */
export function useAskNotifications(): () => Promise<string> {
  const notifications = useNotifications();
  const setPermission = useUi((s) => s.setNotifPermission);
  return useCallback(async () => {
    const current = await notifications.permission();
    const next = current === 'prompt' ? await notifications.request() : current;
    setPermission(next);
    return next;
  }, [notifications, setPermission]);
}
