import { addCategory, deleteCategory, updateCategory, useDb } from '@kairo/db';
import { Button, Field, inkFor, Sheet } from '@kairo/ui';
import { useTranslation } from 'react-i18next';
import { Swatches } from '../components/Swatches';
import { DEFAULT_NEW_END, DEFAULT_NEW_START, DEFAULT_REMINDER } from '../lib/actions';
import { GoalStepper } from '../components/GoalStepper';
import { useUi } from '../store';

/** Fiche « Nouvelle / Modifier activité » de la maquette. */
export function ActivitySheet() {
  const { t } = useTranslation('app');
  const db = useDb();
  const open = useUi((s) => s.sheet === 'act');
  const form = useUi((s) => s.actForm);
  const patch = useUi((s) => s.patchAct);
  const close = useUi((s) => s.closeSheet);
  const flash = useUi((s) => s.flash);

  const save = async () => {
    const name = form.name.trim();
    if (!name) return flash(t('acts.nameRequired'));
    const input = { name, color: form.color, weeklyGoalH: form.weeklyGoalH };
    if (form.id) {
      await updateCategory(db, form.id, input);
      close();
      return flash(t('activity.updated'));
    }
    const cat = await addCategory(db, input);
    const { returnTo, blockForm, weekDay } = useUi.getState();
    if (returnTo === 'block') {
      // Retour à la fiche créneau, avec la nouvelle activité choisie.
      useUi.getState().openBlock({
        ...(blockForm ?? {
          id: null,
          days: [weekDay],
          once: null,
          startMin: DEFAULT_NEW_START,
          endMin: DEFAULT_NEW_END,
          reminderMin: DEFAULT_REMINDER,
          steps: [],
          note: '',
          stepInput: '',
        }),
        categoryId: cat.id,
      });
    } else close();
  };

  const remove = async () => {
    if (!form.id) return;
    const undo = await deleteCategory(db, form.id);
    close();
    flash(t('activity.deleted'), t('common.undo'), undo);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => (o ? null : close())}
      label={t('activity.dialog')}
      title={
        <>
          {form.id ? t('activity.titleEdit') : t('activity.titleNew')}{' '}
          <em>{t('activity.titleB')}</em>
        </>
      }
    >
      <Field
        value={form.name}
        maxLength={60}
        onChange={(e) => patch({ name: e.target.value })}
        placeholder={t('acts.name')}
        aria-label={t('acts.name')}
      />
      <Swatches value={form.color} onChange={(color) => patch({ color })} />
      <GoalStepper value={form.weeklyGoalH} onChange={(weeklyGoalH) => patch({ weeklyGoalH })} />
      <div className="flex gap-2.5">
        <Button
          className="h-14 flex-[2] text-input"
          style={{ background: form.color, color: inkFor(form.color) }}
          onClick={() => void save()}
        >
          {t('common.save')}
        </Button>
        {form.id ? (
          <Button
            variant="ghost"
            className="h-14 flex-1 border-danger/40 bg-transparent text-alert"
            onClick={() => void remove()}
          >
            {t('common.delete')}
          </Button>
        ) : null}
      </div>
    </Sheet>
  );
}
