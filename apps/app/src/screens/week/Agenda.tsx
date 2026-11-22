import { buildAgenda, checkKey, dateKey } from '@kairo/core';
import type { Block } from '@kairo/db';
import { inkFor, Pressable, shade, withAlpha } from '@kairo/ui';
import { useTranslation } from 'react-i18next';
import { useAppData } from '../../lib/data';
import { useFormat } from '../../lib/format';
import { useSheetActions } from '../../lib/actions';

/** Hauteurs visuelles de la maquette (px), proportionnelles à la durée. */
const freeHeight = (len: number) => Math.round(Math.min(84, Math.max(48, len * 0.2)));
const blockHeight = (len: number) => Math.round(Math.min(150, Math.max(70, len * 0.55)));

/** Agenda d'un jour : créneaux en dégradé, moments libres en pointillé, ligne « Maintenant ». */
export function Agenda({ date, weekday, now }: { date: Date; weekday: number; now: Date }) {
  const { t } = useTranslation('app');
  const f = useFormat();
  const { blocks, checks, categoryOf, settings } = useAppData();
  const { newBlock, editBlock } = useSheetActions();
  const rhythm = { wakeMin: settings.profile.wakeMin, sleepMin: settings.profile.sleepMin };
  const items = buildAgenda<Block>(blocks, date, { rhythm, now });
  const day = dateKey(date);

  return (
    <ol className="m-0 flex list-none flex-col gap-2 p-0">
      {items.map((it) => {
        if (it.kind === 'now') {
          return (
            <li key="now" className="flex items-center gap-2.5 py-0.5">
              <span className="w-12 mono-num text-label font-semibold text-acc-text">
                {f.clock(it.minute)}
              </span>
              <span
                aria-hidden="true"
                className="size-2.5 flex-none rounded-pill bg-acc shadow-[0_0_12px_var(--k-acc)]"
              />
              <span
                aria-hidden="true"
                className="h-0.5 flex-1 rounded-pill bg-[linear-gradient(90deg,var(--k-acc),transparent)]"
              />
              <span className="mono-num text-micro tracking-[0.14em] text-acc-text">
                {t('week.now')}
              </span>
            </li>
          );
        }
        if (it.kind === 'free') {
          const len = it.to - it.from;
          return (
            <li key={`free-${it.from}`} className="flex gap-2.5">
              <span className="w-12 pt-3 mono-num text-label text-ink3">{f.clock(it.from)}</span>
              <Pressable
                onClick={() => newBlock(weekday, it.suggestStart, it.suggestEnd)}
                className="flex flex-1 items-center justify-between rounded-row border-[1.5px] border-dashed border-line px-4 text-ink3"
                style={{ height: freeHeight(len) }}
              >
                <span className="text-small font-semibold">
                  {t('week.freeLabel', { d: f.duration(len) })}
                  <span className="sr-only">
                    {' '}
                    ({t('week.freeAria', { from: f.clock(it.from), to: f.clock(it.to) })})
                  </span>
                </span>
                <span className="font-serif text-input italic text-ink2">{t('week.addHere')}</span>
              </Pressable>
            </li>
          );
        }
        const b = it.occurrence.slot;
        const cat = categoryOf(b.categoryId);
        const ink = inkFor(cat.color);
        const st = checks[checkKey(day, b.id)];
        const len = it.to - it.from;
        const statusText =
          st === 'done'
            ? t('week.statusDone')
            : st === 'missed'
              ? t('week.statusMissed')
              : it.current
                ? t('week.statusNow')
                : null;
        return (
          <li key={b.id} className="flex gap-2.5">
            <span className="flex w-12 flex-col gap-0.5 pt-3.5">
              <span className="mono-num text-caption font-semibold text-ink">
                {f.clock(b.startMin)}
              </span>
              <span className="mono-num text-micro text-ink3">{f.clock(b.endMin)}</span>
            </span>
            <Pressable
              onClick={() => editBlock(b)}
              className="relative flex flex-1 flex-col justify-between gap-2 overflow-hidden rounded-tile px-4 py-3.5 text-left"
              style={{
                minHeight: blockHeight(len),
                background: `linear-gradient(140deg, ${cat.color} 0%, ${shade(cat.color, -0.28)} 100%)`,
                color: ink,
                opacity: st === 'missed' ? 0.5 : 1,
                boxShadow: it.current
                  ? `0 0 0 2px var(--k-bg), 0 0 0 4px ${cat.color}, 0 14px 40px ${withAlpha(cat.color, 0.45)}`
                  : `0 10px 28px ${withAlpha(cat.color, 0.18)}`,
              }}
            >
              <span
                aria-hidden="true"
                className="absolute -right-7.5 -top-10 size-30 rounded-pill bg-card-hi blur-[30px]"
              />
              <span className="relative flex items-start justify-between gap-2">
                <span className="text-sub font-bold leading-tight tracking-[-0.02em]">
                  {cat.name}
                  <span className="sr-only">
                    , {f.clock(b.startMin)} – {f.clock(b.endMin)}
                  </span>
                </span>
                {statusText ? (
                  <span className="flex-none rounded-icon bg-shade/30 px-2 py-1 mono-num text-micro font-semibold tracking-[0.08em]">
                    {statusText}
                  </span>
                ) : null}
              </span>
              <span className="relative flex flex-wrap gap-2.5 mono-num text-label opacity-80">
                <span>{f.duration(len)}</span>
                {b.reminderMin !== null ? (
                  <span>
                    {t('week.reminder')}{' '}
                    {b.reminderMin ? t('week.minutes', { n: b.reminderMin }) : t('week.onTime')}
                  </span>
                ) : null}
                <span>· {b.once ? t('common.oneOff') : f.daysText(b.days)}</span>
              </span>
            </Pressable>
          </li>
        );
      })}
    </ol>
  );
}
