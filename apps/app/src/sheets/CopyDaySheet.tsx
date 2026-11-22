import { recurringOn } from '@kairo/core';
import { copyDayBlocks, useDb } from '@kairo/db';
import { Button, Pressable, Sheet } from '@kairo/ui';
import { useTranslation } from 'react-i18next';
import { useAppData } from '../lib/data';
import { useFormat } from '../lib/format';
import { useUi } from '../store';

/** « Copier lundi vers d'autres jours » : ajoute les jours choisis aux créneaux récurrents. */
export function CopyDaySheet() {
  const { t } = useTranslation('app');
  const db = useDb();
  const f = useFormat();
  const { blocks } = useAppData();
  const open = useUi((s) => s.sheet === 'dup');
  const source = useUi((s) => s.weekDay);
  const targets = useUi((s) => s.dup);
  const toggle = useUi((s) => s.toggleDup);
  const close = useUi((s) => s.closeSheet);
  const flash = useUi((s) => s.flash);

  const apply = async () => {
    if (!targets.length) return flash(t('block.pickDay'));
    const undo = await copyDayBlocks(db, source, targets);
    close();
    flash(t('dup.done', { n: targets.length }), t('common.undo'), undo);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => (o ? null : close())}
      label={t('dup.dialog')}
      title={
        <>
          {t('dup.title')} <em>{f.dayInSentence(source)}</em>
        </>
      }
    >
      <p className="m-0 text-chip text-ink2">{t('dup.body', { n: recurringOn(blocks, source) })}</p>
      <div className="grid grid-cols-7 gap-1.5">
        {[0, 1, 2, 3, 4, 5, 6].map((d) => {
          const src = d === source;
          const on = targets.includes(d);
          return (
            <Pressable
              key={d}
              haptic
              disabled={src}
              aria-pressed={src || on}
              aria-label={f.dayName(d)}
              onClick={() => toggle(d)}
              className={`h-11.5 rounded-step text-center text-chip font-bold ${
                src ? 'bg-acc text-acc-ink' : on ? 'bg-inv text-inv-ink' : 'bg-card text-ink2'
              }`}
            >
              {f.dayLetter(d)}
            </Pressable>
          );
        })}
      </div>
      <Button className="h-14 text-input" onClick={() => void apply()}>
        {t('dup.apply')}
      </Button>
    </Sheet>
  );
}
