import { reducedFade, spring } from '@kairo/ui';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KairoMark } from '../components/KairoMark';
import { useUi } from '../store';

/** Durée minimale d'affichage : le logo a le temps d'être vu, même si la base répond vite. */
export const SPLASH_MIN_MS = 1500;

const reduceMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Écran de chargement au lancement : logo Kairo et signature de l'auteur en bas de page.
 * Il reste au moins 1,5 s, jusqu'à ce que la base locale soit lue, puis s'efface en fondu.
 * Thème Minuit fixe : les réglages (thème, accent) ne sont pas encore connus à ce moment-là.
 */
export function Splash() {
  const { t } = useTranslation('app');
  const ready = useUi((s) => s.dataReady);
  const [minDone, setMinDone] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setMinDone(true), SPLASH_MIN_MS);
    return () => window.clearTimeout(id);
  }, []);

  const visible = !ready || !minDone;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="splash"
          role="status"
          aria-label={t('splash.loading')}
          className="theme-minuit accent-lav fixed inset-0 z-[70] flex flex-col items-center justify-center bg-bg text-ink"
          initial={false}
          exit={{ opacity: 0, transition: reduceMotion ? reducedFade : { duration: 0.45 } }}
        >
          <motion.div
            className="flex flex-col items-center gap-5"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={reduceMotion ? reducedFade : spring('screen')}
          >
            <span className="animate-breath">
              <KairoMark size={128} />
            </span>
            <span
              className="text-[3.25rem] leading-none font-extrabold tracking-[-0.055em]"
              aria-hidden="true"
            >
              kairo
            </span>
          </motion.div>
          <p className="absolute inset-x-0 bottom-[max(2rem,env(safe-area-inset-bottom))] m-0 text-center mono-num text-label tracking-[0.12em] text-ink3">
            {t('splash.signature', { year: new Date().getFullYear() })}
          </p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
