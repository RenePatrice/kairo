import {
  dateKey,
  nextFreeStart,
  slotConflicts,
  durationMin,
  isAsleep,
  normalizeMinute,
  reminderMinute,
  stepMinute,
} from '@kairo/core';
import { deleteBlock, saveBlock, useDb } from '@kairo/db';
import { Button, Field, GlassSurface, inkFor, Pressable, Sheet, Stepper } from '@kairo/ui';
import { useTranslation } from 'react-i18next';
import { useAppData } from '../lib/data';
import { useFormat } from '../lib/format';
import { useSheetActions } from '../lib/actions';
import { useAskNotifications } from '../lib/notifPermission';
import { useUi } from '../store';

const QUICK_DURATIONS = [30, 45, 60, 90, 120, 240, 720] as const;
const REMINDERS = [null, 0, 5, 10, 30] as const;
const MIN_LENGTH = 15;

/** Fiche « Nouveau / Modifier créneau » de la maquette, en verre épais. */
export function BlockSheet() {
  const { t } = useTranslation('app');
  const db = useDb();
  const f = useFormat();
  const { categories, blocks, categoryOf, settings } = useAppData();
  const { newActivity } = useSheetActions();
  const open = useUi((s) => s.sheet === 'block');
  const form = useUi((s) => s.blockForm);
  const patch = useUi((s) => s.patchBlock);
  const close = useUi((s) => s.closeSheet);
  const flash = useUi((s) => s.flash);

  const askNotifications = useAskNotifications();
  if (!form) return null;
  const length = durationMin(form.startMin, form.endMin);
  const rhythm = { wakeMin: settings.profile.wakeMin, sleepMin: settings.profile.sleepMin };
  // Un horaire déjà pris est refusé (plus de chevauchement) ; on propose le prochain libre.
  const today = dateKey(new Date());
  const draft = { ...form, id: form.id ?? '' };
  const conflicts = slotConflicts(draft, blocks, today);
  const taken = conflicts.length
    ? t('block.taken', {
        list: conflicts
          .map(
            (c) =>
              `${categoryOf(c.slot.categoryId).name} (${c.days.map((d) => f.dayName(d).slice(0, 3)).join(', ')})`,
          )
          .join(' · '),
      })
    : '';
  const freeStart = conflicts.length ? nextFreeStart(draft, blocks, today) : null;
  const warning =
    !taken &&
    form.reminderMin !== null &&
    isAsleep(reminderMinute(form.startMin, form.reminderMin), rhythm)
      ? t('block.sleepWarn')
      : '';
  const valid = Boolean(form.categoryId) && (Boolean(form.once) || form.days.length > 0) && !taken;

  const save = async () => {
    if (!form.categoryId) return flash(t('block.pickActivity'));
    if (!form.once && !form.days.length) return flash(t('block.pickDay'));
    if (taken) return flash(t('block.pickFree'));
    const pending = form.stepInput.trim();
    const saved = await saveBlock(db, {
      id: form.id,
      categoryId: form.categoryId,
      days: form.days,
      once: form.once,
      startMin: form.startMin,
      endMin: form.endMin,
      reminderMin: form.reminderMin,
      steps: pending ? [...form.steps, pending] : form.steps,
      note: form.note,
    });
    close();
    if (saved.reminderMin !== null && settings.options.remind) void askNotifications();
    flash(
      form.id
        ? t('block.updated')
        : t('block.added', { days: saved.once ? t('common.oneOff') : f.daysText(saved.days) }),
    );
  };

  const remove = async () => {
    if (!form.id) return;
    const undo = await deleteBlock(db, form.id);
    close();
    flash(t('block.deleted'), t('common.undo'), undo);
  };

  const addStep = () => {
    const s = form.stepInput.trim();
    if (s) patch({ steps: [...form.steps, s], stepInput: '' });
  };

  const toggleDay = (d: number) =>
    patch({ days: form.days.includes(d) ? form.days.filter((x) => x !== d) : [...form.days, d] });

  const timeCard = (
    label: string,
    minute: number,
    onMinus: () => void,
    onPlus: () => void,
    minusLabel: string,
    plusLabel: string,
  ) => (
    <GlassSurface className="flex flex-col items-center gap-2 rounded-slot p-3.5">
      <span className="label-mono">{label}</span>
      <span className="num text-hero" aria-live="polite">
        {f.clock(minute)}
      </span>
      <span className="flex gap-1.5">
        <Stepper className="h-9.5 w-12 text-lead" aria-label={minusLabel} onClick={onMinus}>
          {t('common.minus')}
        </Stepper>
        <Stepper className="h-9.5 w-12 text-lead" aria-label={plusLabel} onClick={onPlus}>
          {t('common.plus')}
        </Stepper>
      </span>
    </GlassSurface>
  );

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => (o ? null : close())}
      label={form.id ? t('block.dialogEdit') : t('block.dialogNew')}
      title={
        <>
          {form.id ? t('block.titleEdit') : t('block.titleNew')} <em>{t('block.titleB')}</em>
        </>
      }
      aside={`${f.duration(length)}${form.endMin <= form.startMin ? t('block.nextDay') : ''}`}
    >
      <section className="flex flex-col gap-2">
        <span className="label-mono">{t('block.activity')}</span>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const on = form.categoryId === c.id;
            const ink = inkFor(c.color);
            return (
              <Pressable
                key={c.id}
                haptic
                aria-pressed={on}
                onClick={() => patch({ categoryId: c.id })}
                className="flex h-11 items-center gap-2 rounded-pill border px-3.5 text-chip font-semibold"
                style={{
                  background: on ? c.color : 'var(--k-card)',
                  color: on ? ink : 'var(--k-ink)',
                  borderColor: on ? c.color : 'var(--k-line)',
                }}
              >
                <span
                  aria-hidden="true"
                  className="size-2.25 rounded-pill"
                  style={{ background: on ? ink : c.color }}
                />
                {c.name}
              </Pressable>
            );
          })}
          <Pressable
            onClick={() => newActivity('block')}
            className="flex h-11 items-center rounded-pill border border-dashed border-ink3 px-3.5 text-chip font-semibold text-ink2"
          >
            {t('block.newActivity')}
          </Pressable>
        </div>
      </section>

      {form.once ? (
        <GlassSurface className="rounded-step p-3 text-chip text-ink2">
          {t('block.once')}{' '}
          <span className="font-semibold text-ink">{form.once.split('-').reverse().join('/')}</span>
        </GlassSurface>
      ) : (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="label-mono">{t('block.days')}</span>
            <span className="flex gap-3">
              <button
                type="button"
                onClick={() => patch({ days: [0, 1, 2, 3, 4] })}
                className="min-h-8 text-caption font-semibold text-acc-text"
              >
                {t('block.week')}
              </button>
              <button
                type="button"
                onClick={() => patch({ days: [0, 1, 2, 3, 4, 5, 6] })}
                className="min-h-8 text-caption font-semibold text-acc-text"
              >
                {t('block.all')}
              </button>
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {[0, 1, 2, 3, 4, 5, 6].map((d) => {
              const on = form.days.includes(d);
              return (
                <Pressable
                  key={d}
                  haptic
                  aria-pressed={on}
                  aria-label={f.dayName(d)}
                  onClick={() => toggleDay(d)}
                  className={`h-11.5 rounded-step text-center text-chip font-bold ${
                    on ? 'bg-inv text-inv-ink' : 'bg-card text-ink2'
                  }`}
                >
                  {f.dayLetter(d)}
                </Pressable>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        {timeCard(
          t('block.start'),
          form.startMin,
          () =>
            patch({ startMin: stepMinute(form.startMin, -1), endMin: stepMinute(form.endMin, -1) }),
          () =>
            patch({ startMin: stepMinute(form.startMin, 1), endMin: stepMinute(form.endMin, 1) }),
          t('block.startEarlier'),
          t('block.startLater'),
        )}
        {timeCard(
          t('block.end'),
          form.endMin,
          () => {
            if (length > MIN_LENGTH) patch({ endMin: stepMinute(form.endMin, -1) });
          },
          () => patch({ endMin: stepMinute(form.endMin, 1) }),
          t('block.endEarlier'),
          t('block.endLater'),
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {QUICK_DURATIONS.map((q) => (
          <Pressable
            key={q}
            onClick={() => patch({ endMin: normalizeMinute(form.startMin + q) })}
            className="h-8.5 rounded-pill border border-line bg-card px-3 text-caption font-semibold"
          >
            {f.duration(q)}
          </Pressable>
        ))}
      </div>

      <section className="flex flex-col gap-2">
        <span className="label-mono">{t('block.steps')}</span>
        {form.steps.map((s, i) => (
          <GlassSurface
            key={`${i}-${s}`}
            className="flex items-center gap-2.5 rounded-step py-1.5 pl-3.5 pr-1.5"
          >
            <span className="mono-num text-label text-ink3">{String(i + 1).padStart(2, '0')}</span>
            <span className="flex-1 text-chip">{s}</span>
            <Pressable
              aria-label={t('common.remove', { name: s })}
              onClick={() => patch({ steps: form.steps.filter((_, j) => j !== i) })}
              className="-my-1.5 flex size-11 items-center justify-center rounded-pill text-ink3"
            >
              {t('common.times')}
            </Pressable>
          </GlassSurface>
        ))}
        <div className="flex gap-2">
          <Field
            className="h-11.5"
            value={form.stepInput}
            maxLength={200}
            onChange={(e) => patch({ stepInput: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addStep();
            }}
            placeholder={t('block.addStep')}
            aria-label={t('block.newStep')}
          />
          <Button
            variant="ghost"
            aria-label={t('block.addStepBtn')}
            onClick={addStep}
            className="size-11.5 flex-none px-0 text-heading"
          >
            {t('common.plus')}
          </Button>
        </div>
      </section>

      <label className="flex flex-col gap-2">
        <span className="label-mono">{t('block.note')}</span>
        <Field
          className="h-11.5"
          value={form.note}
          maxLength={500}
          onChange={(e) => patch({ note: e.target.value })}
          placeholder={t('block.notePh')}
        />
      </label>

      <section className="flex flex-col gap-2">
        <span className="label-mono">{t('block.reminder')}</span>
        <div className="flex flex-wrap gap-1.5">
          {REMINDERS.map((r) => {
            const on = form.reminderMin === r;
            return (
              <Pressable
                key={String(r)}
                haptic
                aria-pressed={on}
                onClick={() => patch({ reminderMin: r })}
                className={`h-9.5 rounded-pill border border-line px-3.25 text-small font-semibold ${
                  on ? 'bg-acc text-acc-ink' : 'bg-card text-ink'
                }`}
              >
                {r === null
                  ? t('block.remNone')
                  : r === 0
                    ? t('block.remOnTime')
                    : t('block.remMin', { n: r })}
              </Pressable>
            );
          })}
        </div>
      </section>

      {taken ? (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-step bg-danger/14 px-3 py-2.5 text-small font-medium text-alert"
        >
          <span className="flex-1">{taken}</span>
          {freeStart !== null ? (
            <Button
              size="sm"
              variant="ghost"
              className="flex-none"
              onClick={() =>
                patch({ startMin: freeStart, endMin: normalizeMinute(freeStart + length) })
              }
            >
              {t('block.takeFree', { time: f.clock(freeStart) })}
            </Button>
          ) : null}
        </div>
      ) : null}

      {warning ? (
        <div
          role="status"
          className="rounded-step bg-warning/14 px-3 py-2.5 text-small font-medium text-warn"
        >
          {warning}
        </div>
      ) : null}

      <div className="flex gap-2.5">
        <Button
          className="h-14 flex-[2] text-input"
          style={{ opacity: valid ? 1 : 0.4 }}
          onClick={() => void save()}
        >
          {t('common.save')}
        </Button>
        {form.id ? (
          <Button variant="danger" className="h-14 flex-1" onClick={() => void remove()}>
            {t('common.delete')}
          </Button>
        ) : null}
      </div>
    </Sheet>
  );
}
