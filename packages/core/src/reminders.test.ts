import { describe, expect, it } from 'vitest';
import { reminderId, remindersAt, upcomingReminders, type ReminderSlot } from './reminders';

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

describe('upcomingReminders', () => {
  const daily = (over: Partial<ReminderSlot> = {}): ReminderSlot => ({
    id: 's',
    days: [0, 1, 2, 3, 4, 5, 6],
    startMin: 1080,
    endMin: 1140,
    reminderMin: 10,
    ...over,
  });
  const base = { remind: true, endCheck: false, checks: {}, restDays: new Set<string>() };
  const monday = new Date('2026-11-23T10:30:00+01:00');
  const iso = (r: { at: Date }) => r.at.toISOString();

  it('programme les 3 prochains jours, triés, à partir de maintenant', () => {
    const list = upcomingReminders([daily()], monday, base);
    expect(list.map(iso)).toEqual([
      '2026-11-23T16:50:00.000Z',
      '2026-11-24T16:50:00.000Z',
      '2026-11-25T16:50:00.000Z',
    ]);
    expect(list[0]).toMatchObject({
      key: '2026-11-23|s|start',
      kind: 'start',
      slotId: 's',
      lead: 10,
    });
  });

  it('place la veille au soir un rappel qui précède un créneau après minuit', () => {
    const list = upcomingReminders([daily({ startMin: 5, endMin: 65 })], monday, base);
    expect(list.map(iso)).toEqual([
      '2026-11-23T22:55:00.000Z',
      '2026-11-24T22:55:00.000Z',
      '2026-11-25T22:55:00.000Z',
    ]);
    expect(list[0]?.key).toBe('2026-11-24|s|start');
  });

  it('suit le changement d’heure (passage à l’heure d’hiver)', () => {
    const saturday = new Date('2026-10-24T12:00:00+02:00');
    const list = upcomingReminders(
      [daily({ startMin: 540, endMin: 600, reminderMin: 30 })],
      saturday,
      {
        ...base,
        days: 2,
      },
    );
    expect(list.map((r) => r.at.getTime())).toEqual([
      new Date('2026-10-25T08:30:00+01:00').getTime(),
    ]);
  });

  it('ajoute « Fait ou raté ? » à la fin, sauf créneau déjà validé', () => {
    const list = upcomingReminders([daily({ reminderMin: null })], monday, {
      ...base,
      endCheck: true,
      checks: { '2026-11-24|s': 'done' },
      days: 3,
    });
    expect(list.map((r) => r.key)).toEqual(['2026-11-23|s|end', '2026-11-25|s|end']);
  });

  it('respecte les journées off, l’option rappels et la limite', () => {
    expect(
      upcomingReminders([daily()], monday, { ...base, restDays: new Set(['2026-11-24']) }).map(
        (r) => r.key,
      ),
    ).toEqual(['2026-11-23|s|start', '2026-11-25|s|start']);
    expect(upcomingReminders([daily()], monday, { ...base, remind: false })).toEqual([]);
    expect(upcomingReminders([daily()], monday, { ...base, limit: 2 })).toHaveLength(2);
  });
});

describe('reminderId', () => {
  it('donne un entier positif sur 31 bits, stable et distinct', () => {
    const a = reminderId('2026-11-23|s|start');
    expect(a).toBe(reminderId('2026-11-23|s|start'));
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(2 ** 31);
    expect(reminderId('2026-11-23|s|end')).not.toBe(a);
  });
});
