import { parseIsoDate, toIsoDate, addDays } from '../shared/dates';
import { Repeat } from './chore.model';
import { describeRepeat, isDue } from './recurrence';

/** Every due day between two dates (inclusive), as "YYYY-MM-DD". */
function dueDays(rule: Repeat, from: string, to: string): string[] {
  const days: string[] = [];
  for (let date = parseIsoDate(from)!; toIsoDate(date) <= to; date = addDays(date, 1)) {
    if (isDue(rule, date)) days.push(toIsoDate(date));
  }
  return days;
}

describe('isDue', () => {
  it('handles every Monday', () => {
    const rule: Repeat = { type: 'weekly', days: ['mon'] };
    expect(dueDays(rule, '2026-10-01', '2026-10-31')).toEqual([
      '2026-10-05',
      '2026-10-12',
      '2026-10-19',
      '2026-10-26',
    ]);
  });

  it('handles several weekdays', () => {
    const rule: Repeat = { type: 'weekly', days: ['mon', 'tue', 'wed'] };
    expect(dueDays(rule, '2026-10-05', '2026-10-11')).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
    ]);
  });

  it('handles every second Monday counted from the start date', () => {
    const rule: Repeat = { type: 'weekly', days: ['mon'], every: 2, start: '2026-10-05' };
    expect(dueDays(rule, '2026-09-01', '2026-11-30')).toEqual([
      '2026-10-05',
      '2026-10-19',
      '2026-11-02',
      '2026-11-16',
      '2026-11-30',
    ]);
  });

  it('counts weeks across a daylight-saving change', () => {
    const rule: Repeat = { type: 'weekly', days: ['sun'], every: 2, start: '2026-10-18' };
    expect(dueDays(rule, '2026-10-18', '2026-11-15')).toEqual([
      '2026-10-18',
      '2026-11-01',
      '2026-11-15',
    ]);
  });

  it('handles every third day', () => {
    const rule: Repeat = { type: 'daily', every: 3, start: '2026-10-30' };
    expect(dueDays(rule, '2026-10-25', '2026-11-06')).toEqual([
      '2026-10-30',
      '2026-11-02',
      '2026-11-05',
    ]);
  });

  it('handles the last day of the month, including February', () => {
    const rule: Repeat = { type: 'monthly', days: ['last'] };
    expect(dueDays(rule, '2027-01-01', '2027-03-31')).toEqual([
      '2027-01-31',
      '2027-02-28',
      '2027-03-31',
    ]);
  });

  it('skips a day of the month that does not exist', () => {
    const rule: Repeat = { type: 'monthly', days: [31] };
    expect(dueDays(rule, '2026-10-01', '2026-12-31')).toEqual(['2026-10-31', '2026-12-31']);
  });

  it('handles every third month', () => {
    const rule: Repeat = { type: 'monthly', days: [15], every: 3, start: '2026-10-01' };
    expect(dueDays(rule, '2026-10-01', '2027-04-30')).toEqual([
      '2026-10-15',
      '2027-01-15',
      '2027-04-15',
    ]);
  });

  it('handles the first Saturday and the last Friday of the month', () => {
    const first: Repeat = { type: 'monthly', weekday: 'sat', nth: 1 };
    const last: Repeat = { type: 'monthly', weekday: 'fri', nth: 'last' };
    expect(dueDays(first, '2026-10-01', '2026-11-30')).toEqual(['2026-10-03', '2026-11-07']);
    expect(dueDays(last, '2026-10-01', '2026-11-30')).toEqual(['2026-10-30', '2026-11-27']);
  });

  it('handles one-off and yearly dates', () => {
    expect(dueDays({ type: 'once', dates: ['2026-11-14'] }, '2026-01-01', '2027-12-31')).toEqual([
      '2026-11-14',
    ]);
    expect(dueDays({ type: 'yearly', dates: ['03-01'] }, '2026-01-01', '2027-12-31')).toEqual([
      '2026-03-01',
      '2027-03-01',
    ]);
  });

  it('respects start and end dates', () => {
    const rule: Repeat = { type: 'weekly', days: ['fri'], start: '2026-10-10', end: '2026-10-25' };
    expect(dueDays(rule, '2026-10-01', '2026-10-31')).toEqual(['2026-10-16', '2026-10-23']);
  });
});

describe('describeRepeat', () => {
  it.each<[Repeat, string]>([
    [{ type: 'weekly', days: ['mon'] }, 'Every Monday'],
    [{ type: 'weekly', days: ['mon', 'tue', 'wed'] }, 'Every Mon, Tue and Wed'],
    [{ type: 'weekly', days: ['mon'], every: 2, start: '2026-10-05' }, 'Every 2 weeks on Monday'],
    [{ type: 'daily' }, 'Every day'],
    [{ type: 'daily', every: 3, start: '2026-10-01' }, 'Every 3 days'],
    [{ type: 'monthly', days: ['last'] }, 'Monthly on the last day'],
    [{ type: 'monthly', days: [1, 15] }, 'Monthly on the 1st and 15th'],
    [{ type: 'monthly', weekday: 'sat', nth: 1 }, 'Monthly on the first Saturday'],
    [{ type: 'once', dates: ['2026-11-14'] }, 'On 14 Nov 2026'],
    [{ type: 'yearly', dates: ['03-01'] }, 'Every year on 1 Mar'],
  ])('describes %j as "%s"', (rule, text) => {
    expect(describeRepeat(rule)).toBe(text);
  });
});
