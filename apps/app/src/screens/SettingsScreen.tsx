import { minuteOfDay, nowAndNext, occurrencesOn } from '@kairo/core';
import {
  accentNames,
  exportBackup,
  resetAll,
  themeNames,
  updateOptions,
  updateSettings,
  useDb,
  type LocaleName,
  type Options,
} from '@kairo/db';
import {
  accents,
  Button,
  GlassSurface,
  inkFor,
  iridescent,
  Pressable,
  shade,
  SwitchRow,
  themes,
} from '@kairo/ui';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '@kairo/platform';
import { useBilanActions } from '../lib/bilans';
import { useAppData } from '../lib/data';
import { useFormat } from '../lib/format';
import { useSheetActions } from '../lib/actions';
import { useNow } from '../lib/useNow';
import { useUi } from '../store';

const OPTION_KEYS: ReadonlyArray<keyof Options> = [
  'solid',
  'remind',
  'local',
  'haptic',
  'autoReview',
  'endCheck',
  'clock12',
  'big',
];
const RESET_ARM_MS = 3000;
const DEFAULT_TEST_LEAD = 10;

/** Écran Réglages de la maquette (« À ta façon. »). */
export function SettingsScreen() {
  const { t } = useTranslation('app');
  const db = useDb();
  const f = useFormat();
  const now = useNow(30_000);
  const { settings, categories, blocks, categoryOf } = useAppData();
  const { newActivity, editActivity } = useSheetActions();
  const flash = useUi((s) => s.flash);
  const go = useUi((s) => s.go);
  const setNotif = useUi((s) => s.setNotif);
  const setNotifPermission = useUi((s) => s.setNotifPermission);
  const notifications = useNotifications();
  const [armed, setArmed] = useState(false);
  const armTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(armTimer.current), []);

  const { current, next } = nowAndNext(blocks, now);
  const widgetOcc = current ?? next;
  const widgetCat = widgetOcc ? categoryOf(widgetOcc.slot.categoryId) : null;
  const widget =
    widgetOcc && widgetCat
      ? {
          c1: widgetCat.color,
          c2: shade(widgetCat.color, -0.35),
          tag: current ? t('settings.widgetNow') : t('settings.widgetNext'),
          name: widgetCat.name,
          big: f.clock(current ? widgetOcc.slot.endMin : widgetOcc.slot.startMin),
          sub: current ? t('settings.widgetEnd') : t('settings.widgetStart'),
          lock: current
            ? t('settings.widgetUntil', {
                name: widgetCat.name,
                time: f.clock(widgetOcc.slot.endMin),
              })
            : t('settings.widgetAt', {
                name: widgetCat.name,
                time: f.clock(widgetOcc.slot.startMin),
              }),
        }
      : {
          c1: iridescent[0],
          c2: shade(iridescent[0], -0.45),
          tag: t('settings.widgetFree'),
          name: t('settings.widgetNothing'),
          big: f.clock(minuteOfDay(now)),
          sub: t('settings.widgetEnjoy'),
          lock: t('settings.widgetNone'),
        };
  const widgetInk = inkFor(widget.c1);

  const exportData = async () => {
    const data = JSON.stringify(await exportBackup(db));
    try {
      await navigator.clipboard.writeText(data);
      flash(t('settings.copied'));
    } catch {
      flash(navigator.clipboard ? t('settings.copyRefused') : t('settings.copyImpossible'));
    }
  };

  /** Demande l'autorisation des notifications système, seulement si elle n'a jamais été donnée. */
  const askPermission = async () => {
    const current = await notifications.permission();
    const next = current === 'prompt' ? await notifications.request() : current;
    setNotifPermission(next);
    return next;
  };

  const testReminder = async () => {
    const todays = occurrencesOn(blocks, now);
    const b = next?.slot ?? current?.slot ?? todays[0]?.slot ?? blocks[0];
    if (!b) return flash(t('settings.needBlock'));
    const lead = b.reminderMin || DEFAULT_TEST_LEAD;
    setNotif({ kind: 'start', blockId: b.id, lead });
    if ((await askPermission()) === 'granted') {
      const name = categoryOf(b.categoryId).name;
      await notifications.showNow({
        id: 1,
        title: t('notif.inMinutes', { name, n: lead }),
        body: `${f.clock(b.startMin)} – ${f.clock(b.endMin)}`,
      });
    }
  };

  const { fillDemo } = useBilanActions();

  const reset = async () => {
    if (!armed) {
      setArmed(true);
      armTimer.current = window.setTimeout(() => setArmed(false), RESET_ARM_MS);
      return;
    }
    window.clearTimeout(armTimer.current);
    await resetAll(db);
    useUi.setState({ screen: 'welcome', sheet: null, focus: null, notif: null });
  };

  return (
    <div className="flex flex-col gap-4 desktop:mx-auto desktop:max-w-160">
      <span className="eyebrow">{t('settings.eyebrow')}</span>
      <h1 className="headline text-hero">
        {t('settings.titleA')} <em>{t('settings.titleB')}</em>.
      </h1>

      <GlassSurface className="flex flex-col gap-3 rounded-card p-4">
        <span className="label-mono">{t('settings.language')}</span>
        <div className="grid grid-cols-2 gap-2">
          {(['fr', 'en'] as const satisfies readonly LocaleName[]).map((code) => {
            const on = (settings.locale ?? 'fr') === code;
            return (
              <Pressable
                key={code}
                haptic
                aria-pressed={on}
                onClick={() => void updateSettings(db, { locale: code })}
                className={`flex h-12 items-center justify-center gap-2 rounded-step border border-line text-chip font-semibold ${
                  on ? 'bg-inv text-inv-ink' : 'bg-card text-ink'
                }`}
              >
                <span className="mono-num text-label opacity-80">{code.toUpperCase()}</span>
                {t(`lang.${code}.name`)}
              </Pressable>
            );
          })}
        </div>
      </GlassSurface>

      <GlassSurface className="flex flex-col gap-3 rounded-card p-4">
        <span className="label-mono">{t('settings.widget')}</span>
        <div className="flex items-stretch gap-3">
          <div
            className="flex size-37.5 flex-none flex-col justify-between rounded-panel p-3.5 shadow-[0_14px_40px_rgba(0,0,0,0.25)]"
            style={{
              background: `linear-gradient(150deg, ${widget.c1}, ${widget.c2})`,
              color: widgetInk,
            }}
          >
            <span className="mono-num text-tiny tracking-[0.14em] opacity-80">{widget.tag}</span>
            <span className="text-heading font-bold leading-tight tracking-snug">
              {widget.name}
            </span>
            <span className="num text-big">{widget.big}</span>
            <span className="mono-num text-micro opacity-80">{widget.sub}</span>
          </div>
          <div className="flex flex-1 flex-col justify-center gap-2">
            <GlassSurface className="flex items-center gap-2 rounded-row px-3 py-2.5">
              <span
                aria-hidden="true"
                className="size-2 rounded-pill"
                style={{ background: widget.c1 }}
              />
              <span className="flex-1 text-caption font-semibold">{widget.lock}</span>
            </GlassSurface>
            <span className="text-caption leading-snug text-ink3">{t('settings.widgetBody')}</span>
          </div>
        </div>
      </GlassSurface>

      <GlassSurface className="flex flex-col gap-3.5 rounded-card p-4">
        <span className="label-mono">{t('settings.ambiance')}</span>
        <div className="grid grid-cols-3 gap-2">
          {themeNames.map((name) => {
            const th = themes[name];
            const on = settings.theme === name;
            return (
              <Pressable
                key={name}
                haptic
                aria-pressed={on}
                onClick={() => void updateSettings(db, { theme: name })}
                className="flex flex-col overflow-hidden rounded-field border-2"
                style={{ borderColor: on ? 'var(--k-acc)' : 'var(--k-line)' }}
              >
                <span
                  aria-hidden="true"
                  className="relative block h-16"
                  style={{ background: th.bg }}
                >
                  <span
                    className="absolute left-2.5 top-2.5 h-1.5 w-10 rounded-xs"
                    style={{ background: th.ink }}
                  />
                  <span className="absolute left-2.5 top-5.5 h-1.5 w-6 rounded-xs bg-acc" />
                  <span
                    className="absolute bottom-2.5 right-2.5 size-5.5 rounded-pill opacity-15"
                    style={{ background: th.ink }}
                  />
                </span>
                <span className="bg-card p-2 text-center text-caption font-semibold">
                  {t(`settings.themes.${name}`)}
                </span>
              </Pressable>
            );
          })}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-chip font-semibold">{t('settings.accent')}</span>
          <span className="flex gap-1">
            {accentNames.map((name) => {
              const c = accents[name].acc;
              const on = settings.accent === name;
              return (
                <Pressable
                  key={name}
                  haptic
                  aria-label={t(`settings.accents.${name}`)}
                  aria-pressed={on}
                  onClick={() => void updateSettings(db, { accent: name })}
                  className="flex size-11 items-center justify-center rounded-pill"
                >
                  <span
                    className="block size-7.5 rounded-pill"
                    style={{
                      background: c,
                      boxShadow: on ? `0 0 0 3px var(--k-bg), 0 0 0 5px ${c}` : 'none',
                    }}
                  />
                </Pressable>
              );
            })}
          </span>
        </div>
      </GlassSurface>

      <GlassSurface className="flex flex-col gap-2.5 rounded-card p-4">
        <span className="label-mono">{t('settings.myActivities')}</span>
        {categories.map((c) => (
          <Pressable
            key={c.id}
            onClick={() => editActivity(c)}
            className="flex min-h-12 items-center gap-3 text-left"
          >
            <span
              aria-hidden="true"
              className="flex size-8.5 items-center justify-center rounded-icon font-bold"
              style={{ background: c.color, color: inkFor(c.color) }}
            >
              {c.name.charAt(0).toUpperCase()}
            </span>
            <span className="flex-1 text-body font-semibold">{c.name}</span>
            <span className="mono-num text-caption text-ink3">
              {c.weeklyGoalH ? t('common.perWeek', { h: c.weeklyGoalH }) : t('common.freeLower')}
            </span>
          </Pressable>
        ))}
        <Button variant="ghost" className="h-11 text-chip" onClick={() => newActivity()}>
          {t('settings.newActivity')}
        </Button>
      </GlassSurface>

      <GlassSurface className="flex items-center justify-between rounded-card p-4">
        <span className="flex flex-col gap-1">
          <span className="label-mono">{t('settings.rhythm')}</span>
          <span className="num text-heading">
            {f.clock(settings.profile.wakeMin)} → {f.clock(settings.profile.sleepMin)}
          </span>
        </span>
        <Button variant="ghost" size="sm" onClick={() => go('rhythm')}>
          {t('common.edit')}
        </Button>
      </GlassSurface>

      <div className="flex flex-col gap-2">
        {OPTION_KEYS.map((k) => (
          <SwitchRow
            key={k}
            name={t(`settings.options.${k}.name`)}
            description={t(`settings.options.${k}.desc`)}
            checked={settings.options[k]}
            onChange={(v) => {
              void updateOptions(db, { [k]: v });
              if ((k === 'remind' || k === 'endCheck') && v) void askPermission();
              // Comme la maquette : les bilans oubliés seront rédigés par le veilleur.
              if (k === 'autoReview' && v) flash(t('announce.autoOn'));
            }}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="ghost" className="h-12 text-chip" onClick={() => void testReminder()}>
          {t('settings.testReminder')}
        </Button>
        <Button variant="ghost" className="h-12 text-chip" onClick={() => void fillDemo()}>
          {t('settings.demo')}
        </Button>
      </div>
      <Button variant="ghost" className="h-12 text-chip" onClick={() => void exportData()}>
        {t('settings.export')}
      </Button>
      <Button variant="danger" className="h-12" onClick={() => void reset()}>
        {armed ? t('settings.resetArm') : t('settings.reset')}
      </Button>
      <p className="m-0 text-center text-caption leading-normal text-ink3">
        {t('settings.privacyA')}
        <br />
        {t('settings.privacyB')}
      </p>
    </div>
  );
}
