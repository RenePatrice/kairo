import {
  AppearanceProvider,
  Button,
  CommandBar,
  Dock,
  GlassSurface,
  HoursBar,
  InsightCard,
  Legend,
  NowCard,
  Pill,
  Sheet,
  StatTile,
  TimeBlock,
  Toast,
  TopicCard,
  WeekGrid,
  accentNames,
  accents,
  ambientColors,
  themeNames,
  useAppearance,
  type AccentName,
  type MotionSetting,
  type ThemeName,
  type TimeBlockVariant,
  type TransparencySetting,
} from '@kairo/ui';
import { minuteOfDay, nowAndNext, type ClockFormat, type Locale } from '@kairo/core';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  activities,
  activityOf,
  baseSlots,
  buildNow,
  buildWeek,
  dayNameFor,
  focusSlotFor,
  paletteColor,
  ghostProposal,
  slotTimeLabel,
  titleOf,
  type DemoSlot,
} from './demo';
import { Segmented } from './Segmented';
import { useNow } from './useNow';

export interface DisplaySettings {
  theme: ThemeName;
  accent: AccentName;
  transparency: TransparencySetting;
  motion: MotionSetting;
  locale: Locale;
}

interface PreviewPageProps {
  settings: DisplaySettings;
  onChange: (patch: Partial<DisplaySettings>) => void;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="eyebrow m-0">
        {'// '}
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Halos d'ambiance qui dérivent derrière le verre (couleur du bloc en cours). */
function Ambient({ colors }: { colors: readonly [string, string] }) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <span
        className="absolute -left-40 -top-56 size-[30rem] animate-drift rounded-pill transition-[background] duration-1000"
        style={{
          background: `radial-gradient(circle, ${colors[0]} 0%, transparent 65%)`,
          opacity: 'var(--k-glow-op)',
        }}
      />
      <span
        className="absolute -right-52 top-72 size-[28rem] animate-drift rounded-pill [animation-direction:reverse] [animation-duration:18s]"
        style={{
          background: `radial-gradient(circle, ${colors[1]} 0%, transparent 65%)`,
          opacity: 'var(--k-glow-op)',
        }}
      />
    </div>
  );
}

const VARIANTS: TimeBlockVariant[] = ['default', 'current', 'ghost', 'sleep'];

export function PreviewPage({ settings, onChange }: PreviewPageProps) {
  const { t } = useTranslation();
  const { glass } = useAppearance();
  const now = useNow();
  const clock: ClockFormat = settings.locale === 'fr' ? '24h' : '12h';

  const [extraSlots, setExtraSlots] = useState<DemoSlot[]>([]);
  const [ghost, setGhost] = useState<DemoSlot | null>(null);
  const [command, setCommand] = useState('');
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null);
  const [opened, setOpened] = useState<{ slot: DemoSlot; dayId: string } | null>(null);
  const [tab, setTab] = useState('week');

  // Le créneau focus change seulement à l'heure pile : inutile de recalculer chaque seconde.
  const hourKey = `${now.toDateString()}-${now.getHours()}`;
  const focus = useMemo(() => (hourKey ? focusSlotFor(new Date()) : null), [hourKey]);
  const slots = useMemo(
    () => [...baseSlots, ...extraSlots, ...(focus ? [focus] : []), ...(ghost ? [ghost] : [])],
    [extraSlots, focus, ghost],
  );

  const openSlot = useCallback((slot: DemoSlot, dayId: string) => setOpened({ slot, dayId }), []);
  const week = buildWeek(slots, now, settings.locale, clock, t, openSlot);
  const nowData = buildNow(slots, now, clock, t);
  const current = nowAndNext(
    slots.filter((s) => !activityOf(s).sleep),
    now,
  ).current;
  const ambient = ambientColors(
    minuteOfDay(now),
    current ? activityOf(current.slot).color : undefined,
  );

  const legend = activities
    .filter((a) => a.id !== 'focus')
    .map((a) => ({ id: a.id, label: t(`app:preview.activities.${a.id}`), color: a.color }));

  const ask = (text: string) => {
    setCommand('');
    setThinking(true);
    // Démo : réponse simulée. En Phase 2, la demande part vers Llama via le relais Supabase.
    window.setTimeout(() => {
      setThinking(false);
      setGhost(ghostProposal());
      void text;
    }, 900);
  };

  const applyGhost = () => {
    if (!ghost) return;
    const added: DemoSlot = {
      ...ghost,
      id: `foot-${Date.now()}`,
      ghost: false,
      title: t('app:preview.football'),
    };
    setExtraSlots((s) => [...s, added]);
    setGhost(null);
    setToast({
      message: t('app:preview.ai.added', { title: added.title }),
      undo: () => setExtraSlots((s) => s.filter((x) => x.id !== added.id)),
    });
  };

  const closeToast = useCallback(() => setToast(null), []);

  const openedTitle = opened ? titleOf(opened.slot, t) : '';

  return (
    <div className="relative isolate min-h-dvh desktop:pl-64">
      <Ambient colors={ambient} />

      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-5 pb-64 pt-14 tablet:px-8 desktop:pb-40">
        <header className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="eyebrow">{t('app:preview.eyebrow')}</span>
            <Pill tone="streak">{t('app:preview.streak')}</Pill>
          </div>
          <h1 className="num m-0 text-hero leading-none">
            {t('app:preview.titleA')}{' '}
            <em className="accent-serif text-[1.12em]">{t('app:preview.titleB')}</em>
          </h1>
          <p className="m-0 max-w-xl text-body leading-relaxed text-ink2">
            {t('app:preview.intro')}
          </p>
        </header>

        <GlassSurface
          as="section"
          aria-label={t('app:preview.controls')}
          className="grid gap-4 rounded-panel p-4 tablet:grid-cols-2"
        >
          <Segmented
            label={t('app:preview.theme')}
            value={settings.theme}
            options={themeNames.map((v) => ({ value: v, label: v[0]?.toUpperCase() + v.slice(1) }))}
            onChange={(theme) => onChange({ theme })}
          />
          <Segmented
            label={t('app:preview.accent')}
            value={settings.accent}
            options={accentNames.map((v) => ({ value: v, label: v, swatch: accents[v].acc }))}
            onChange={(accent) => onChange({ accent })}
          />
          <Segmented
            label={t('app:preview.transparency')}
            value={settings.transparency}
            options={[
              { value: 'auto', label: t('app:preview.auto') },
              { value: 'reduced', label: t('app:preview.reduced') },
            ]}
            onChange={(transparency) => onChange({ transparency })}
          />
          <Segmented
            label={t('app:preview.motion')}
            value={settings.motion}
            options={[
              { value: 'auto', label: t('app:preview.auto') },
              { value: 'reduced', label: t('app:preview.reducedMotion') },
            ]}
            onChange={(motion) => onChange({ motion })}
          />
          <Segmented
            label={t('app:preview.language')}
            value={settings.locale}
            options={[
              { value: 'fr', label: 'Français' },
              { value: 'en', label: 'English' },
            ]}
            onChange={(locale) => onChange({ locale })}
          />
          <p className="m-0 self-end mono-num text-caption text-ink3">
            {t('app:preview.glassNow', { quality: glass })}
          </p>
        </GlassSurface>

        <Section title={t('app:preview.sections.now')}>
          <div className="grid gap-4 desktop:grid-cols-[1.4fr_1fr]">
            <NowCard current={nowData.current ?? null} next={nowData.next ?? null} />
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                label={t('app:preview.stats.done')}
                value="11,5"
                unit="h"
                hint={t('app:preview.stats.vsPlan')}
              />
              <StatTile label={t('app:preview.stats.streak')} value="7" unit="j" />
              <StatTile label={t('app:preview.stats.rate')} value="86" unit="%" />
              <TopicCard
                eyebrow={t('app:preview.topic.eyebrow')}
                title={t('app:preview.topic.title')}
              />
            </div>
          </div>
          <GlassSurface className="rounded-card p-4">
            <HoursBar
              items={[
                {
                  id: 'labo',
                  label: t('app:preview.activities.labo'),
                  color: paletteColor('miel'),
                  doneMin: 660,
                  plannedMin: 540,
                  valueLabel: '11 h / 9 h',
                },
                {
                  id: 'udemy',
                  label: t('app:preview.activities.udemy'),
                  color: paletteColor('pivoine'),
                  doneMin: 420,
                  plannedMin: 600,
                  valueLabel: '7 h / 10 h',
                },
                {
                  id: 'sport',
                  label: t('app:preview.activities.sport'),
                  color: paletteColor('azur'),
                  doneMin: 120,
                  plannedMin: 180,
                  valueLabel: '2 h / 3 h',
                },
              ]}
            />
          </GlassSurface>
        </Section>

        <Section title={t('app:preview.sections.week')}>
          <Legend items={legend} />
          <WeekGrid
            window={week.window}
            marks={week.marks}
            days={week.days}
            nowMin={week.nowMin}
            hourHeight={44}
          />
        </Section>

        <Section title={t('app:preview.sections.blocks')}>
          <div className="grid grid-cols-2 gap-3 tablet:grid-cols-4">
            {VARIANTS.map((v) => (
              <div key={v} className="flex flex-col gap-2">
                <span className="label-mono">{t(`app:preview.variants.${v}`)}</span>
                <div className="h-20">
                  <TimeBlock
                    title={t(
                      v === 'sleep'
                        ? 'app:preview.activities.sommeil'
                        : 'app:preview.activities.revisions',
                    )}
                    timeLabel={v === 'sleep' ? '23:30–07:00' : '20:30–22:00'}
                    color={paletteColor(v === 'sleep' ? 'ardoise' : 'lavande')}
                    note={v === 'default' ? t('app:preview.sampleNote') : undefined}
                    variant={v}
                    ariaLabel={t(`app:preview.variants.${v}`)}
                  />
                </div>
              </div>
            ))}
            <div className="col-span-2 flex flex-col gap-2 tablet:col-span-4">
              <span className="label-mono">{t('app:preview.compact')}</span>
              <div className="h-9 max-w-xs">
                <TimeBlock
                  title={t('app:preview.activities.diner')}
                  timeLabel="19:30–20:15"
                  color={paletteColor('sable')}
                  compact
                  ariaLabel={t('app:preview.compact')}
                />
              </div>
            </div>
          </div>
        </Section>

        <Section title={t('app:preview.sections.ai')}>
          <div className="grid gap-4 tablet:grid-cols-2">
            {ghost ? (
              <InsightCard
                title={t('app:preview.ai.proposalTitle')}
                body={t('app:preview.ai.proposal', {
                  title: t('app:preview.football'),
                  day: dayNameFor(5, now, settings.locale),
                  time: slotTimeLabel(ghost, clock),
                })}
                onApply={applyGhost}
                onDismiss={() => setGhost(null)}
              />
            ) : (
              <InsightCard
                title={t('app:preview.ai.reviewTitle')}
                body={t('app:preview.ai.review')}
                chart={<MiniChart />}
              />
            )}
            <GlassSurface className="flex flex-col gap-2 rounded-card p-4 text-small text-ink2">
              <p className="m-0">{t('app:preview.ai.ghostHint')}</p>
              <p className="m-0 text-ink3">{t('app:preview.ai.demoNote')}</p>
            </GlassSurface>
          </div>
        </Section>

        <Section title={t('app:preview.sections.glass')}>
          <div className="grid gap-4 desktop:grid-cols-3">
            {themeNames.map((theme) => (
              <AppearanceProvider
                key={theme}
                theme={theme}
                accent={settings.accent}
                transparency={settings.transparency}
                motion={settings.motion}
                className="relative overflow-hidden rounded-panel p-4"
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-0 flex flex-wrap gap-2 p-3 opacity-90"
                >
                  {activities.slice(0, 6).map((a) => (
                    <span
                      key={a.id}
                      className="h-14 w-20 rounded-block"
                      style={{ background: a.color }}
                    />
                  ))}
                </div>
                <div className="relative grid grid-cols-2 gap-3 pt-10">
                  <GlassSurface
                    level="regular"
                    interactive
                    className="flex flex-col gap-1 rounded-card p-3"
                  >
                    <span className="label-mono">{t('app:preview.glassLabel')}</span>
                    <span className="num text-lead capitalize">{theme}</span>
                  </GlassSurface>
                  <AppearanceProvider
                    theme={theme}
                    accent={settings.accent}
                    transparency="reduced"
                    className="contents"
                  >
                    <GlassSurface level="regular" className="flex flex-col gap-1 rounded-card p-3">
                      <span className="label-mono">{t('app:preview.solidLabel')}</span>
                      <span className="num text-lead capitalize">{theme}</span>
                    </GlassSurface>
                  </AppearanceProvider>
                </div>
              </AppearanceProvider>
            ))}
          </div>
        </Section>

        <Section title={t('app:preview.sections.controls')}>
          <div className="flex flex-wrap items-center gap-3">
            <Button>{t('app:preview.sheet.save')}</Button>
            <Button variant="accent">{t('ui:common.apply')}</Button>
            <Button variant="ghost">{t('ui:common.dismiss')}</Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setToast({ message: t('app:preview.ai.removed'), undo: () => undefined })
              }
            >
              {t('app:preview.showToast')}
            </Button>
            <Pill tone="streak">{t('app:preview.streak')}</Pill>
            <Pill tone="success">{t('app:preview.rest')}</Pill>
            <Pill tone="accent">✦ Llama</Pill>
          </div>
        </Section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-3 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] desktop:left-64 desktop:mx-auto desktop:max-w-2xl desktop:pb-6">
        <Toast
          message={toast?.message ?? null}
          {...(toast?.undo ? { onUndo: toast.undo } : {})}
          onClose={closeToast}
          className="flex justify-center"
        />
        <CommandBar
          value={command}
          onChange={setCommand}
          onSubmit={ask}
          suggestions={
            ghost || thinking
              ? []
              : (t('app:preview.ai.suggestions', { returnObjects: true }) as string[])
          }
          thinking={thinking}
          listening={listening}
          onToggleVoice={() => setListening((l) => !l)}
        />
        <Dock
          className="desktop:hidden"
          tabs={[
            { id: 'today', label: t('ui:nav.today'), icon: 'today' },
            { id: 'week', label: t('ui:nav.week'), icon: 'week' },
            { id: 'stats', label: t('ui:nav.stats'), icon: 'stats' },
            { id: 'me', label: t('ui:nav.me'), icon: 'me' },
          ]}
          current={tab}
          onSelect={setTab}
          onAssistant={() =>
            document.querySelector<HTMLInputElement>('input[enterkeyhint="send"]')?.focus()
          }
        />
      </div>

      <div className="fixed inset-y-4 left-4 z-30 hidden w-56 desktop:block">
        <Dock
          className="h-full"
          tabs={[
            { id: 'today', label: t('ui:nav.today'), icon: 'today' },
            { id: 'week', label: t('ui:nav.week'), icon: 'week' },
            { id: 'stats', label: t('ui:nav.stats'), icon: 'stats' },
            { id: 'me', label: t('ui:nav.me'), icon: 'me' },
          ]}
          current={tab}
          onSelect={setTab}
          onAssistant={() =>
            document.querySelector<HTMLInputElement>('input[enterkeyhint="send"]')?.focus()
          }
        />
      </div>

      <Sheet
        open={opened !== null}
        onOpenChange={(o) => {
          if (!o) setOpened(null);
        }}
        title={openedTitle}
        description={opened ? `${slotTimeLabel(opened.slot, clock)}` : undefined}
        layoutId={opened ? `block-${opened.dayId}-${opened.slot.id}` : undefined}
      >
        {opened ? (
          <div className="flex flex-col gap-4">
            <div className="h-16">
              <TimeBlock
                title={openedTitle}
                timeLabel={slotTimeLabel(opened.slot, clock)}
                color={activityOf(opened.slot).color}
                variant={
                  opened.slot.ghost ? 'ghost' : activityOf(opened.slot).sleep ? 'sleep' : 'default'
                }
                ariaLabel={openedTitle}
              />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setOpened(null)}>
                {t('app:preview.sheet.save')}
              </Button>
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  const removed = opened.slot;
                  setOpened(null);
                  setExtraSlots((s) => s.filter((x) => x.id !== removed.id));
                  setToast({ message: t('app:preview.ai.removed'), undo: () => undefined });
                }}
              >
                {t('app:preview.sheet.delete')}
              </Button>
            </div>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}

/** Mini-graphique de démonstration pour la carte de bilan IA. */
function MiniChart() {
  const values = [5, 7, 4, 9, 6, 8, 3];
  return (
    <div className="flex h-16 items-end gap-1.5">
      {values.map((v, i) => (
        <span
          key={i}
          className="flex-1 rounded-t-[6px] bg-acc"
          style={{ height: `${v * 10}%`, opacity: 0.45 + v / 20 }}
        />
      ))}
    </div>
  );
}
