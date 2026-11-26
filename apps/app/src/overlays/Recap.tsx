import { isoWeek, isoWeekday, DAY_MOMENTS } from '@kairo/core';
import { Icon, Overlay, OverlayClose, recap, shade, status, withAlpha } from '@kairo/ui';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSheetActions } from '../lib/actions';
import { useBilans } from '../lib/bilans';
import { useAppData } from '../lib/data';
import { useFormat } from '../lib/format';
import { useNow } from '../lib/useNow';
import { useUi } from '../store';

const SLIDE_MS = 6500;
/** Créneau proposé au dernier écran, selon le moment où l'énergie est la plus haute. */
const SLOT_START = { morning: 480, afternoon: 840, evening: 1140 } as const;
const SLOT_LEN = 45;

interface Slide {
  eyebrow: string;
  lead: string;
  big: string;
  bigSize: number;
  bigColor: string;
  body: string;
  bg: string;
  rows?: Array<{ name: string; color: string; w: number; v: string }>;
  cta?: string;
}

/** « Ta semaine, racontée. » : 4 écrans façon stories (maquette : « RÉCAP »). */
export function Recap() {
  const index = useUi((s) => s.recap);
  const setRecap = useUi((s) => s.setRecap);
  const { t } = useTranslation('app');
  const open = index !== null;
  return (
    <Overlay open={open} onClose={() => setRecap(null)} label={t('recap.dialog')}>
      {open ? <Stories index={index} /> : null}
    </Overlay>
  );
}

function Stories({ index }: { index: number }) {
  const { t } = useTranslation('app');
  const f = useFormat();
  const now = useNow(60_000);
  const { categories } = useAppData();
  const data = useBilans(now);
  const setRecap = useUi((s) => s.setRecap);
  const { newBlock } = useSheetActions();

  // Avance seule, comme des stories ; chaque changement d'écran relance le minuteur.
  useEffect(() => {
    const id = window.setTimeout(() => setRecap(index < 3 ? index + 1 : index), SLIDE_MS);
    return () => window.clearTimeout(id);
  }, [index, setRecap]);

  const acts = data.acts
    .map((a) => ({ ...a, cat: categories.find((c) => c.id === a.categoryId) }))
    .filter((a) => a.cat);
  const ranked = acts.filter((a) => a.plannedMin > 0).sort((a, b) => b.ratio - a.ratio);
  const strong = ranked[0];
  const weak = ranked.length > 1 ? ranked[ranked.length - 1] : undefined;
  const focusAct = weak && weak.ratio < 0.8 ? weak : strong;
  const total = acts.reduce((m, a) => m + a.doneMin, 0);
  const maxDone = Math.max(1, ...acts.map((a) => a.doneMin));
  const bestMoment = DAY_MOMENTS.reduce(
    (m, k) => (data.moments[k] > data.moments[m] ? k : m),
    'morning',
  );
  const hasEnergy = data.moments[bestMoment] > 0;
  const m = data.momentum;

  const slides: Slide[] = [
    {
      eyebrow: t('recap.s1Eyebrow', { n: isoWeek(now).week }),
      lead: t('recap.s1Lead'),
      big: f.hours(total),
      bigSize: 110,
      bigColor: recap.accent,
      body: t('recap.s1Body'),
      bg: recap.slideWeek,
      rows: acts
        .filter((a) => a.doneMin)
        .sort((a, b) => b.doneMin - a.doneMin)
        .slice(0, 4)
        .map((a) => ({
          name: a.cat?.name ?? '',
          color: a.cat?.color ?? recap.accent,
          w: Math.round((a.doneMin / maxDone) * 100),
          v: f.hours(a.doneMin),
        })),
    },
    {
      eyebrow: t('recap.s2Eyebrow'),
      lead: t('recap.s2Lead'),
      big: strong?.cat?.name ?? '—',
      bigSize: strong?.cat && strong.cat.name.length > 10 ? 64 : 88,
      bigColor: strong?.cat?.color ?? recap.ink,
      body: strong
        ? strong.goalMin
          ? t('recap.s2BodyGoal', {
              hours: f.hours(strong.doneMin),
              pct: Math.round(strong.ratio * 100),
            })
          : t('recap.s2Body', { hours: f.hours(strong.doneMin) })
        : t('recap.s2Empty'),
      bg: strong?.cat
        ? `linear-gradient(160deg, ${recap.slideStrongBase}, ${shade(strong.cat.color, -0.55)})`
        : recap.slideStrongBase,
    },
    {
      eyebrow: t('recap.s3Eyebrow'),
      lead: t('recap.s3Lead'),
      big: m.current === null ? '—' : `${Math.round(m.current * 100)} %`,
      bigSize: 110,
      bigColor: status.success,
      body:
        (m.trend === null
          ? ''
          : m.trend >= 0
            ? t('recap.s3Up', { n: m.trend })
            : t('recap.s3Down', { n: -m.trend })) +
        (data.series.current ? t('recap.s3Streak', { n: data.series.current }) : ''),
      bg: recap.slideRate,
    },
    {
      eyebrow: t('recap.s4Eyebrow'),
      lead: weak && weak.ratio < 0.8 ? t('recap.s4LeadWeak') : t('recap.s4LeadStrong'),
      big: focusAct?.cat?.name ?? '—',
      bigSize: 76,
      bigColor: focusAct?.cat?.color ?? recap.ink,
      body:
        (hasEnergy ? t('recap.s4Energy', { moment: t(`insight.moments.${bestMoment}`) }) : '') +
        t('recap.s4Body'),
      bg: recap.slideNext,
      cta: t('recap.s4Cta'),
    },
  ];
  const slide = slides[index] ?? slides[0];
  if (!slide) return null;

  const addSlot = () => {
    setRecap(null);
    if (!focusAct) return;
    const start = SLOT_START[hasEnergy ? bestMoment : 'evening'];
    newBlock(isoWeekday(now), start, start + SLOT_LEN);
    useUi.getState().patchBlock({ categoryId: focusAct.categoryId });
  };

  return (
    <div
      className="absolute inset-0 overflow-clip transition-[background] duration-700"
      style={{ background: slide.bg, color: recap.ink }}
    >
      <div
        aria-hidden="true"
        className="absolute -bottom-40 -left-30 size-105 animate-morph iridescent opacity-45 blur-[60px]"
      />
      <div className="absolute inset-x-4 top-4 z-[2] grid grid-cols-4 gap-1.25" aria-hidden="true">
        {slides.map((s, i) => (
          <span
            key={s.eyebrow}
            className="h-0.75 overflow-hidden rounded-xs"
            style={{ background: withAlpha(recap.ink, 0.3) }}
          >
            <span
              key={`${i}-${index}`}
              className={`block h-full ${i === index ? 'animate-fill' : ''}`}
              style={{
                background: recap.ink,
                width: i < index ? '100%' : i === index ? undefined : 0,
              }}
            />
          </span>
        ))}
      </div>
      <OverlayClose
        aria-label={t('recap.close')}
        className="absolute right-3.5 top-7.5 z-[3] flex size-11 items-center justify-center rounded-pill"
      >
        <Icon name="close" size={20} />
      </OverlayClose>
      <button
        type="button"
        aria-label={t('recap.prev')}
        onClick={() => setRecap(Math.max(0, index - 1))}
        className="absolute bottom-30 left-0 top-20 z-[1] w-[35%]"
      />
      <button
        type="button"
        aria-label={t('recap.next')}
        onClick={() => setRecap(index < 3 ? index + 1 : null)}
        className="absolute bottom-30 right-0 top-20 z-[1] w-[65%]"
      />
      <div
        key={index}
        className="pointer-events-none absolute inset-0 mx-auto flex max-w-120 flex-col gap-3.5 px-6.5 pb-10 pt-24"
        aria-live="polite"
      >
        <span className="mono-num text-label tracking-[0.2em] opacity-75">{slide.eyebrow}</span>
        <span className="text-title font-semibold leading-tight tracking-[-0.03em]">
          {slide.lead}
        </span>
        <span
          className="font-serif italic leading-[0.95] tracking-[-0.03em]"
          style={{ fontSize: slide.bigSize, color: slide.bigColor }}
        >
          {slide.big}
        </span>
        <span className="text-sub leading-normal opacity-90">{slide.body}</span>
        {slide.rows?.length ? (
          <div className="mt-2 flex flex-col gap-2">
            {slide.rows.map((r) => (
              <div key={r.name} className="flex items-center gap-2.5">
                <span className="w-30 truncate text-small font-semibold">{r.name}</span>
                <span
                  className="h-2.5 flex-1 overflow-hidden rounded-xs"
                  style={{ background: withAlpha(recap.ink, 0.18) }}
                >
                  <span
                    className="block h-full rounded-xs"
                    style={{ width: `${r.w}%`, background: r.color }}
                  />
                </span>
                <span className="w-11 text-right mono-num text-caption">{r.v}</span>
              </div>
            ))}
          </div>
        ) : null}
        {slide.cta ? (
          <button
            type="button"
            onClick={addSlot}
            className="pointer-events-auto relative z-[3] mt-auto h-14.5 rounded-pill text-input font-bold"
            style={{ background: recap.ctaBg, color: recap.ctaInk }}
          >
            {slide.cta}
          </button>
        ) : null}
      </div>
    </div>
  );
}
