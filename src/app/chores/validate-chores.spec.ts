import { Chore } from './chore.model';
import { validateChore } from './validate-chores';

const chore = (overrides: object) =>
  ({
    name: 'Trash',
    color: 'blue',
    repeat: { type: 'weekly', days: ['mon'] },
    ...overrides,
  }) as Chore;

describe('validateChore', () => {
  it('accepts a valid chore', () => {
    expect(validateChore(chore({}), 0)).toEqual([]);
  });

  it('names the chore and the problem', () => {
    expect(validateChore(chore({ color: 'green' }), 2)).toEqual([
      'Aufgabe 3 "Trash": "color" muss blue oder red sein',
    ]);
  });

  it('catches typos in weekdays and dates', () => {
    expect(validateChore(chore({ repeat: { type: 'weekly', days: ['monday'] } }), 0)).toHaveLength(
      1,
    );
    expect(
      validateChore(chore({ repeat: { type: 'once', dates: ['2026-02-30'] } }), 0),
    ).toHaveLength(1);
  });

  it('requires a start date for intervals', () => {
    expect(
      validateChore(chore({ repeat: { type: 'weekly', days: ['mon'], every: 2 } }), 0),
    ).toEqual(['Aufgabe 1 "Trash": "every": 2 braucht ein "start"-Datum']);
  });

  it('accepts anytime chores and rejects mixing times with days', () => {
    expect(validateChore(chore({ repeat: { type: 'weekly', times: 2 } }), 0)).toEqual([]);
    expect(validateChore(chore({ repeat: { type: 'monthly', times: 1 } }), 0)).toEqual([]);
    expect(
      validateChore(chore({ repeat: { type: 'weekly', times: 2, days: ['mon'] } }), 0),
    ).toHaveLength(1);
    expect(validateChore(chore({ repeat: { type: 'weekly', times: 0 } }), 0)).toHaveLength(1);
  });

  it('rejects an unknown repeat type', () => {
    expect(validateChore(chore({ repeat: { type: 'hourly' } }), 0)).toHaveLength(1);
  });
});
