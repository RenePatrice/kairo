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

export type SpeechLocale = 'fr' | 'en';

/** Dictée d'une phrase pour l'assistant (micro de la barre de saisie). */
export interface Speech {
  /** Reconnaissance vocale disponible sur cet appareil / navigateur. */
  available(): Promise<boolean>;
  /**
   * Écoute une phrase et renvoie le texte reconnu, ou `null` (rien entendu, arrêté, micro refusé).
   * L'autorisation du micro est demandée à ce moment-là, jamais au lancement.
   */
  listen(locale: SpeechLocale): Promise<string | null>;
  /** Arrête l'écoute en cours. */
  stop(): Promise<void>;
}

export type SaveResult = 'saved' | 'shared' | 'cancelled' | 'failed';

/** Fichiers : enregistrer une sauvegarde hors de l'app. */
export interface Files {
  /**
   * Enregistre un fichier texte : téléchargement (navigateur) ou menu Partager (téléphone).
   * `title` sert de titre au menu Partager.
   */
  saveText(name: string, text: string, mime?: string, title?: string): Promise<SaveResult>;
}

/** Bouton Retour du téléphone. */
export interface Back {
  /**
   * Écoute le bouton Retour. `handler` ferme ce qui est ouvert et renvoie `true`, ou `false`
   * s'il n'y avait rien à fermer (l'app passe alors en arrière-plan). Renvoie de quoi arrêter.
   */
  onBack(handler: () => boolean): () => void;
  minimize(): Promise<void>;
}

/** Annonce vocale programmée (« Sport dans 10 minutes »), texte déjà traduit. */
export interface VoiceAnnouncement {
  id: number;
  at: Date;
  text: string;
}

/** Voix de synthèse : annonce les rappels à voix haute. */
export interface Voice {
  /** `true` si les annonces programmées parlent même app fermée (APK). */
  readonly background: boolean;
  /** Dit la phrase tout de suite (rappel app ouverte, test). */
  speak(text: string, locale: SpeechLocale): Promise<void>;
  /** Remplace toutes les annonces programmées. Sans effet sur le web (l'app parle quand elle est ouverte). */
  schedule(list: readonly VoiceAnnouncement[], locale: SpeechLocale): Promise<void>;
}

/** Ce que montre le minuteur de focus hors de l'app. */
export interface FocusStatusInfo {
  title: string;
  text: string;
  /** Fin de la phase en cours (ms Unix) : compte à rebours en direct. `null` en pause. */
  endAt: number | null;
}

/** Minuteur de focus visible hors de l'app : notification permanente, écran verrouillé. */
export interface FocusStatus {
  show(info: FocusStatusInfo): Promise<void>;
  hide(): Promise<void>;
}

export interface Platform {
  kind: PlatformKind;
  haptics: Haptics;
  notifications: Notifications;
  speech: Speech;
  files: Files;
  back: Back;
  voice: Voice;
  focusStatus: FocusStatus;
}
