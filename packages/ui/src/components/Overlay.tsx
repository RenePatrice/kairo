import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useAppearance } from '../appearance/context';
import { riseIn, transitionFor } from '../motion/transitions';

export interface OverlayProps {
  open: boolean;
  onClose: () => void;
  /** Nom accessible (« Mode focus », « Assistant »). */
  label: string;
  children: ReactNode;
  className?: string;
}

/**
 * Écran plein par-dessus l'app (mode focus, assistant) : fond du thème, entrée en montée douce.
 * Radix gère le piège de focus, Échap et l'accessibilité.
 */
export function Overlay({ open, onClose, label, children, className = '' }: OverlayProps) {
  const { theme, accent, reduceMotion } = useAppearance();
  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                className={`theme-${theme} accent-${accent} ${
                  reduceMotion ? 'k-reduce-motion' : ''
                } fixed inset-0 z-50 overflow-hidden bg-bg text-ink ${className}`}
                initial={reduceMotion ? { opacity: 0 } : riseIn.initial}
                animate={riseIn.animate}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                transition={{
                  ...transitionFor('screen', reduceMotion),
                  opacity: { duration: 0.3 },
                }}
              >
                <Dialog.Title className="sr-only">{label}</Dialog.Title>
                {children}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}

/** Bouton rond « fermer » des écrans pleins. */
export const OverlayClose = Dialog.Close;
