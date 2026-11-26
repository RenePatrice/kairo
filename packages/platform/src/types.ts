/**
 * Ce qui dépend du téléphone passe par cette interface. Les écrans ne savent jamais
 * sur quelle plateforme ils tournent : haptique, notifications (rappels), puis fichiers et partage.
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

/** Rappel à programmer dans le système (titre et texte déjà traduits par l'app). */
export interface ScheduledReminder {
  /** Entier stable sur 31 bits (`reminderId` de @kairo/core). */
  id: number;
  at: Date;
  title: string;
  body: string;
}

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface Notifications {
  /** `true` si les rappels programmés sonnent même app fermée (APK, app iOS). */
  readonly background: boolean;
  permission(): Promise<PermissionState>;
  /** Demande l'autorisation : à appeler en contexte (« Tester un rappel »), jamais au lancement. */
  request(): Promise<PermissionState>;
  /** Remplace toutes les notifications programmées par celles-ci. */
  schedule(list: readonly ScheduledReminder[]): Promise<void>;
  /** Notification immédiate (test d'un rappel). */
  showNow(reminder: Omit<ScheduledReminder, 'at'>): Promise<void>;
}

export interface Platform {
  kind: PlatformKind;
  haptics: Haptics;
  notifications: Notifications;
}
