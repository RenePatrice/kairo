import { describe, expect, it } from 'vitest';
import { remindersAt, type ReminderSlot } from './reminders';

const MON = new Date(2026, 10, 23);
const slots: ReminderSlot[] = [
  { id: 'a', days: [0], startMin: 1080, endMin: 1140, reminderMin: 10 },
  { id: 'b', days: [0], startMin: 600, endMin: 660, reminderMin: 0 },
  { id: 'c', days: [0], startMin: 700, endMin: 760, reminderMin: null },
];
const opts = { remind: true, endCheck: true, checks: {} };

describe('rappels', () => {
  it('sonne N minutes avant, ou à l’heure', () => {
    expect(remindersAt(slots, MON, 1070, opts)).toMatchObject([{ kind: 'start', lead: 10 }]);
    expect(remindersAt(slots, MON, 600, opts)).toMatchObject([{ kind: 'start', lead: 0 }]);
    expect(remindersAt(slots, MON, 690, opts)).toEqual([]);
  });

  it('demande « Fait ou raté ? » à la fin si rien n’est validé', () => {
    expect(remindersAt(slots, MON, 760, opts)).toMatchObject([{ kind: 'end' }]);
    expect(remindersAt(slots, MON, 760, { ...opts, checks: { '2026-11-23|c': 'done' } })).toEqual(
      [],
    );
  });

  it('respecte les réglages', () => {
    expect(remindersAt(slots, MON, 1070, { ...opts, remind: false })).toEqual([]);
    expect(remindersAt(slots, MON, 760, { ...opts, endCheck: false })).toEqual([]);
  });
});
