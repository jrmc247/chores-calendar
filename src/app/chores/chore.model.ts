import { Weekday } from '../shared/dates';

/** Shape of public/chores.json. See the README for examples. */
export interface ChoresFile {
  chores: Chore[];
}

export const CHORE_COLORS = ['blue', 'red'] as const;
export type ChoreColor = (typeof CHORE_COLORS)[number];

export interface Chore {
  name: string;
  color: ChoreColor;
  repeat: Repeat;
}

export type Repeat = OnceRule | DailyRule | WeeklyRule | MonthlyRule | YearlyRule;

/** Optional limits shared by the repeating rules. Dates are "YYYY-MM-DD". */
interface Interval {
  /** Repeat every N days / weeks / months. Defaults to 1. Needs `start` when above 1. */
  every?: number;
  /** First possible day, and the reference point for `every`. */
  start?: string;
  /** Last possible day. */
  end?: string;
}

/** Specific dates, e.g. { "type": "once", "dates": ["2026-11-14"] } */
export interface OnceRule {
  type: 'once';
  dates: string[];
}

/** e.g. { "type": "daily", "every": 3, "start": "2026-10-01" } */
export interface DailyRule extends Interval {
  type: 'daily';
}

/** e.g. { "type": "weekly", "days": ["mon", "wed"] } */
export interface WeeklyRule extends Interval {
  type: 'weekly';
  days: Weekday[];
}

export type DayOfMonth = number | 'last';
export type NthWeek = 1 | 2 | 3 | 4 | 5 | 'last';

/**
 * Either fixed days:      { "type": "monthly", "days": [1, 15, "last"] }
 * or an nth weekday:      { "type": "monthly", "weekday": "sat", "nth": 1 }
 */
export interface MonthlyRule extends Interval {
  type: 'monthly';
  days?: DayOfMonth[];
  weekday?: Weekday;
  nth?: NthWeek;
}

/** Same day(s) every year as "MM-DD", e.g. { "type": "yearly", "dates": ["03-21"] } */
export interface YearlyRule {
  type: 'yearly';
  dates: string[];
}
