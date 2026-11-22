import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppearance } from '../appearance/context';
import { useMediaQuery } from '../appearance/useMediaQuery';
import { GlassSurface } from '../glass/GlassSurface';
import { transitionFor } from '../motion/transitions';
import { breakpoints } from '../tokens';
import { Icon } from './Icon';

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Élément partagé : le bloc d'origine se transforme en fiche. */
  layoutId?: string;
}

/**
 * Feuille en verre épais : feuille du bas sur téléphone, panneau latéral sur ordinateur.
 * Radix gère le focus, Échap et l'accessibilité ; Motion gère les ressorts.
 */
export function Sheet({ open, onOpenChange, title, description, children, layoutId }: SheetProps) {
  const { t } = useTranslation('ui');
  const { theme, accent, reduceMotion } = useAppearance();
  const desktop = useMediaQuery(`(min-width: ${breakpoints.desktop}px)`);
  const themeClasses = `theme-${theme} accent-${accent}`;
  const transition = transitionFor('screen', reduceMotion);
  const offscreen = desktop ? { x: '105%' } : { y: '105%' };
  // Avec un élément partagé, c'est la transformation du bloc qui fait l'animation.
  const slide = !reduceMotion && !layoutId;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className={`${themeClasses} fixed inset-0 z-40 bg-shade`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={transition}
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              forceMount
              {...(description ? {} : { 'aria-describedby': undefined })}
            >
              <motion.div
                layoutId={layoutId}
                className={`${themeClasses} fixed z-50 text-ink ${
                  desktop
                    ? 'inset-y-3 right-3 w-[26rem] max-w-[calc(100vw-1.5rem)]'
                    : 'inset-x-0 bottom-0 max-h-[92dvh]'
                }`}
                initial={slide ? offscreen : { opacity: 0 }}
                animate={slide ? { x: 0, y: 0 } : { opacity: 1 }}
                exit={slide ? offscreen : { opacity: 0 }}
                transition={transition}
              >
                <GlassSurface
                  level="thick"
                  className={`flex h-full max-h-[inherit] flex-col gap-4 overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] ${
                    desktop ? 'rounded-sheet' : 'rounded-t-sheet'
                  }`}
                >
                  {desktop ? null : (
                    <span
                      aria-hidden="true"
                      className="mx-auto -mt-1 h-1.5 w-10 flex-none rounded-pill bg-ink3/50"
                    />
                  )}
                  <header className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <Dialog.Title className="m-0 num text-title">{title}</Dialog.Title>
                      {description ? (
                        <Dialog.Description className="m-0 text-small text-ink2">
                          {description}
                        </Dialog.Description>
                      ) : null}
                    </div>
                    <Dialog.Close
                      aria-label={t('common.close')}
                      className="flex size-11 flex-none items-center justify-center rounded-pill border border-line bg-card text-ink2"
                    >
                      <Icon name="close" size={18} />
                    </Dialog.Close>
                  </header>
                  {children}
                </GlassSurface>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
