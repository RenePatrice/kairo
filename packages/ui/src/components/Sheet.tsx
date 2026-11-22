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
  /** Titre affiché (peut contenir un <em> serif, comme « Nouveau <em>créneau</em> »). */
  title: ReactNode;
  /** Nom accessible de la boîte de dialogue si `title` n'est pas du texte simple. */
  label?: string;
  /** Petite info à droite du titre (durée…). */
  aside?: ReactNode;
  description?: string;
  children: ReactNode;
  /** Élément partagé : le bloc d'origine se transforme en fiche. */
  layoutId?: string;
}

/**
 * Feuille en verre épais : feuille du bas sur téléphone, panneau latéral sur ordinateur.
 * Radix gère le focus, Échap et l'accessibilité ; Motion gère les ressorts.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  label,
  aside,
  description,
  children,
  layoutId,
}: SheetProps) {
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
              {...(label ? { 'aria-label': label } : {})}
            >
              <motion.div
                layoutId={layoutId}
                className={`${themeClasses} fixed z-50 text-ink ${
                  desktop
                    ? 'inset-y-3 right-3 w-[26rem] max-w-[calc(100vw-1.5rem)]'
                    : 'inset-x-2 bottom-2 max-h-[calc(100dvh-1rem)]'
                }`}
                initial={slide ? offscreen : { opacity: 0 }}
                animate={slide ? { x: 0, y: 0 } : { opacity: 1 }}
                exit={slide ? offscreen : { opacity: 0 }}
                transition={transition}
              >
                <GlassSurface
                  level="thick"
                  className="no-scrollbar flex h-full max-h-[inherit] flex-col gap-4 overflow-y-auto rounded-sheet px-5 pb-[max(1.375rem,env(safe-area-inset-bottom))] pt-2.5"
                >
                  <span
                    aria-hidden="true"
                    className="mx-auto h-1.25 w-10 flex-none rounded-pill bg-line"
                  />
                  <header className="flex items-baseline justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <Dialog.Title className="headline text-display">{title}</Dialog.Title>
                      {description ? (
                        <Dialog.Description className="m-0 text-small text-ink2">
                          {description}
                        </Dialog.Description>
                      ) : null}
                    </div>
                    {aside ? (
                      <span className="mono-num text-caption text-ink3">{aside}</span>
                    ) : null}
                  </header>
                  {/* La maquette ferme en touchant le fond ; ce bouton sert au clavier et aux lecteurs d'écran. */}
                  <Dialog.Close
                    aria-label={t('common.close')}
                    className="sr-only flex size-11 items-center justify-center rounded-pill border border-line bg-card text-ink2 focus-visible:not-sr-only focus-visible:absolute focus-visible:right-4 focus-visible:top-4"
                  >
                    <Icon name="close" size={18} />
                  </Dialog.Close>
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
