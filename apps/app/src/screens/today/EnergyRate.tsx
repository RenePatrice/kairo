import type { EnergyLevel } from '@kairo/core';
import { setEnergy, useDb } from '@kairo/db';
import { GlassSurface, Pressable, activityPalette, transitionFor, useAppearance } from '@kairo/ui';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useUi } from '../../store';

const hex = (key: string) =>
  activityPalette.find((c) => c.key === key)?.hex ?? activityPalette[0].hex;
/** Couleur des barres selon la note (maquette : ardoise, miel, abricot). */
const LIT: Record<EnergyLevel, string> = { 1: hex('ardoise'), 2: hex('miel'), 3: hex('abricot') };
const LEVELS: EnergyLevel[] = [1, 2, 3];

/** « Bravo. Comment tu te sens après … ? » : note d'énergie juste après « Fait ». */
export function EnergyRate() {
  const { t } = useTranslation('app');
  const db = useDb();
  const rate = useUi((s) => s.rate);
  const setRate = useUi((s) => s.setRate);
  const flash = useUi((s) => s.flash);
  const { reduceMotion } = useAppearance();
  if (!rate) return null;
  const labels = t('energy.levels', { returnObjects: true }) as string[];

  const pick = async (level: EnergyLevel) => {
    await setEnergy(db, rate.day, rate.blockId, level);
    setRate(null);
    flash(level === 3 ? t('energy.thanksHigh') : t('energy.thanks'));
  };

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={transitionFor('interaction', reduceMotion)}
    >
      <GlassSurface className="flex flex-col gap-3 rounded-card p-4">
        <span className="text-body leading-snug">
          {t('energy.question')} <span className="font-serif text-lead italic">{rate.name}</span> ?
        </span>
        <div className="grid grid-cols-3 gap-2">
          {LEVELS.map((level) => (
            <GlassSurface key={level} className="rounded-field">
              <Pressable
                onClick={() => void pick(level)}
                className="flex w-full flex-col items-center gap-1.5 rounded-field px-1.5 py-3 text-center"
              >
                <span aria-hidden="true" className="flex h-5.5 items-end gap-0.75">
                  {[8, 14, 22].map((h, i) => (
                    <span
                      key={h}
                      className="w-1.25 rounded-xs"
                      style={{ height: h, background: i < level ? LIT[level] : 'var(--k-track)' }}
                    />
                  ))}
                </span>
                <span className="text-small font-semibold">{labels[level - 1]}</span>
              </Pressable>
            </GlassSurface>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setRate(null)}
          className="min-h-11 self-center text-small text-ink3"
        >
          {t('energy.skip')}
        </button>
      </GlassSurface>
    </motion.div>
  );
}
