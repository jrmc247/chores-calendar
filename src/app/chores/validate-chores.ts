import { WEEKDAYS, parseIsoDate } from '../shared/dates';
import { Chore, PERSON_COLORS } from './chore.model';

/**
 * Checks one hand-written chore from chores.json.
 * Returns readable problems (empty when the chore is fine) so typos show up on the page.
 */
export function validateChore(chore: Chore, position: number): string[] {
  const label = `Chore ${position + 1}${chore?.name ? ` "${chore.name}"` : ''}`;
  return findProblems(chore).map((problem) => `${label}: ${problem}`);
}

function findProblems(chore: Chore): string[] {
  if (typeof chore?.name !== 'string' || !chore.name.trim()) return ['needs a "name"'];
  if (!PERSON_COLORS.includes(chore.color))
    return [`"color" must be ${PERSON_COLORS.join(' or ')}`];

  const rule = chore.repeat;
  const problems: string[] = [];
  const check = (ok: boolean, problem: string) => ok || problems.push(problem);

  switch (rule?.type) {
    case 'once':
      check(isList(rule.dates, isIsoDate), '"dates" must be a list like ["2026-11-14"]');
      return problems;
    case 'yearly':
      check(isList(rule.dates, isMonthDay), '"dates" must be a list like ["03-21"]');
      return problems;
    case 'weekly':
      check(isList(rule.days, isWeekday), `"days" must be a list of ${WEEKDAYS.join(', ')}`);
      break;
    case 'monthly':
      if (rule.days !== undefined) {
        check(isList(rule.days, isDayOfMonth), '"days" must be a list of 1 to 31 or "last"');
      } else {
        check(isWeekday(rule.weekday), '"weekday" must be one of ' + WEEKDAYS.join(', '));
        check(isNth(rule.nth), '"nth" must be 1 to 5 or "last"');
      }
      break;
    case 'daily':
      break;
    default:
      return ['"repeat.type" must be once, daily, weekly, monthly or yearly'];
  }

  // Shared by daily, weekly and monthly.
  const every = rule.every ?? 1;
  check(Number.isInteger(every) && every >= 1, '"every" must be a whole number of 1 or more');
  check(every === 1 || rule.start !== undefined, `"every": ${every} needs a "start" date`);
  check(rule.start === undefined || isIsoDate(rule.start), '"start" must look like "2026-10-05"');
  check(rule.end === undefined || isIsoDate(rule.end), '"end" must look like "2026-12-31"');
  return problems;
}

function isList<T>(value: unknown, isItem: (item: unknown) => boolean): value is T[] {
  return Array.isArray(value) && value.length > 0 && value.every(isItem);
}

function isIsoDate(value: unknown): boolean {
  return typeof value === 'string' && parseIsoDate(value) !== null;
}

function isMonthDay(value: unknown): boolean {
  return typeof value === 'string' && isIsoDate(`2000-${value}`);
}

function isWeekday(value: unknown): boolean {
  return WEEKDAYS.includes(value as never);
}

function isDayOfMonth(value: unknown): boolean {
  return (
    value === 'last' ||
    (Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 31)
  );
}

function isNth(value: unknown): boolean {
  return value === 'last' || [1, 2, 3, 4, 5].includes(value as number);
}
