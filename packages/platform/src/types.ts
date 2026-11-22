/**
 * Ce qui dépend du téléphone passe par cette interface. Les écrans ne savent jamais
 * sur quelle plateforme ils tournent. Phase 0 : haptique. Phase 1+ : notifications, fichiers, partage.
 */
export type PlatformKind = 'web' | 'android' | 'ios';

export type ImpactStyle = 'light' | 'medium' | 'heavy';
export type NotificationFeedback = 'success' | 'warning' | 'error';

export interface Haptics {
  /** Petit choc physique : début de glisser, appui sur un contrôle important. */
  impact(style?: ImpactStyle): Promise<void>;
  /** Retour de résultat : validation, avertissement, erreur. */
  notify(type: NotificationFeedback): Promise<void>;
  /** Tic léger quand une sélection change (stepper, onglets). */
  selection(): Promise<void>;
}

export interface Platform {
  kind: PlatformKind;
  haptics: Haptics;
}
