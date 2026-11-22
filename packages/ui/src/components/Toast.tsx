import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppearance } from '../appearance/context';
import { GlassSurface } from '../glass/GlassSurface';
import { transitionFor } from '../motion/transitions';

/** Toute action est annulable pendant 5 secondes (cahier des charges). */
export const UNDO_WINDOW_MS = 5000;

export interface ToastProps {
  /** Message affiché ; null = toast fermé. */
  message: string | null;
  /** Action d'annulation ; le libellé par défaut est « Annuler ». */
  onUndo?: () => void;
  undoLabel?: string;
  /** Appelé à la fin du délai ou après « Annuler ». */
  onClose: () => void;
  duration?: number;
  className?: string;
}

/** Toast flottant en verre, avec Annuler plutôt qu'une fenêtre de confirmation. */
export function Toast({
  message,
  onUndo,
  undoLabel,
  onClose,
  duration = UNDO_WINDOW_MS,
  className = '',
}: ToastProps) {
  const { t } = useTranslation('ui');
  const { reduceMotion } = useAppearance();

  useEffect(() => {
    if (message === null) return;
    const id = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(id);
  }, [message, duration, onClose]);

  return (
    <div role="status" aria-live="polite" className={className}>
      <AnimatePresence>
        {message !== null ? (
          <motion.div
            key={message}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            transition={transitionFor('bouncy', reduceMotion)}
          >
            <GlassSurface
              level="thick"
              className="flex items-center gap-3 overflow-hidden rounded-card py-2 pl-4 pr-2"
            >
              <span className="text-small font-medium">{message}</span>
              {onUndo ? (
                <button
                  type="button"
                  onClick={() => {
                    onUndo();
                    onClose();
                  }}
                  className="h-11 rounded-pill bg-acc px-4 text-small font-bold text-acc-ink"
                >
                  {undoLabel ?? t('common.undo')}
                </button>
              ) : null}
              <motion.span
                aria-hidden="true"
                className="absolute bottom-0 left-0 h-0.5 bg-acc"
                initial={{ width: '100%' }}
                animate={{ width: 0 }}
                transition={{ duration: duration / 1000, ease: 'linear' }}
              />
            </GlassSurface>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
