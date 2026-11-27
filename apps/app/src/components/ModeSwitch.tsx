import { setAppMode, useDb } from '@kairo/db';
import { GlassSurface, Icon, Pressable } from '@kairo/ui';
import { useTranslation } from 'react-i18next';
import { useAppData } from '../lib/data';
import { useUi } from '../store';

/** Capsule « Temps | Budget » en haut des écrans : deux apps réunies en une. */
export function ModeSwitch() {
  const { t } = useTranslation('app');
  const db = useDb();
  const { settings } = useAppData();
  const go = useUi((s) => s.go);
  const mode = settings.mode;

  const pick = async (next: 'time' | 'budget') => {
    if (next === mode) return;
    await setAppMode(db, next);
    go(next === 'budget' ? 'money' : 'today');
  };

  return (
    <GlassSurface
      role="group"
      aria-label={t('budget.modeLabel')}
      className="inline-flex gap-1 self-start rounded-pill p-1"
    >
      {(
        [
          ['time', 'today', t('budget.modeTime')],
          ['budget', 'wallet', t('budget.modeBudget')],
        ] as const
      ).map(([id, icon, label]) => (
        <Pressable
          key={id}
          haptic
          onClick={() => void pick(id)}
          aria-pressed={mode === id}
          className={`flex h-11 items-center gap-2 rounded-pill px-4 text-small font-semibold ${
            mode === id ? 'bg-inv text-inv-ink' : 'text-ink2'
          }`}
        >
          <Icon name={icon} size={16} />
          {label}
        </Pressable>
      ))}
    </GlassSurface>
  );
}
