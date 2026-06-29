import type { Book, Entry, RecurringRule } from "./model";

const MONTH_NAMES = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
] as const;

const WEEKDAY_NAMES = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"] as const;

export function datesFor(rule: RecurringRule, year: number, month: number): string[] {
  if (!rule.active || !isMonthInRange(rule, year, month)) return [];

  const allDates: string[] = [];
  for (const cursor of monthsFromStartTo(rule, year, month)) {
    if (!isMonthInRange(rule, cursor.year, cursor.month)) continue;
    allDates.push(...datesForOneMonth(rule, cursor.year, cursor.month));
    if (rule.maxCount !== null && allDates.length >= rule.maxCount) break;
  }

  const limitedDates = rule.maxCount === null ? allDates : allDates.slice(0, rule.maxCount);
  return limitedDates.filter((date) => date.startsWith(`${year}-${pad(month)}-`));
}

export function expandTemplate(template: string, isoDate: string): string {
  const { year, month, day } = parseIsoDate(isoDate);
  const date = noonDate(year, month, day);
  const weekday = WEEKDAY_NAMES[date.getDay()];

  return template
    .replaceAll("{datum}", `${pad(day)}/${pad(month)}`)
    .replaceAll("{dag}", pad(day))
    .replaceAll("{maand}", pad(month))
    .replaceAll("{maandnaam}", MONTH_NAMES[month - 1] ?? "")
    .replaceAll("{weekdag}", weekday ?? "");
}

export function syncRecurringEntriesForBook(book: Book): void {
  for (const year of book.years) {
    syncRecurringEntriesForYear(book, year.year);
  }
}

export function syncRecurringEntriesForYear(book: Book, targetYear: number): void {
  const year = book.years.find((item) => item.year === targetYear);
  if (!year) return;

  const rulePrefixes = book.recurringRules.map((rule) => `${rule.id}-`);
  for (const month of year.months) {
    if (month.locked) continue;
    month.entries = month.entries.filter((entry) => !rulePrefixes.some((prefix) => entry.id.startsWith(prefix)));
  }

  book.recurringRules.forEach((rule, ruleIndex) => {
    for (const month of year.months) {
      if (month.locked) continue;
      for (const date of datesFor(rule, year.year, month.month)) {
        month.entries.push(entryFromRule(rule, date, ruleIndex));
      }
      month.entries.sort((left, right) => left.createdAt - right.createdAt);
    }
  });
}

function datesForOneMonth(rule: RecurringRule, year: number, month: number): string[] {
  switch (rule.frequency) {
    case "monthly":
      return [isoDate(year, month, 1)];
    case "quarterly":
      return (month - rule.startMonth) % 3 === 0 ? [isoDate(year, month, 1)] : [];
    case "yearly":
      return month === rule.startMonth ? [isoDate(year, month, 1)] : [];
    case "months":
      return parseNumberList(rule.pattern).includes(month) ? [isoDate(year, month, 1)] : [];
    case "dates":
      return datesFromPattern(rule.pattern, year, month);
    case "weekday":
      return weekdaysInMonth(rule.pattern, year, month);
  }
}

function datesFromPattern(pattern: string, year: number, month: number): string[] {
  const dates: string[] = [];
  for (const token of tokens(pattern)) {
    const parts = token.split("/");
    const day = Number(parts[0]);
    const tokenMonth = parts.length > 1 ? Number(parts[1]) : month;
    if (tokenMonth !== month || !isValidDay(year, month, day)) continue;
    dates.push(isoDate(year, month, day));
  }
  return dates;
}

function entryFromRule(rule: RecurringRule, date: string, ruleIndex: number): Entry {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  return {
    id: `${rule.id}-${date}`,
    section: rule.section,
    subcategoryId: rule.subcategoryId,
    date,
    party: rule.party,
    description: expandTemplate(rule.description, date),
    amountCents: rule.amountCents,
    comment: "",
    createdAt: Date.UTC(year, month - 1, day, 0, 0, ruleIndex),
  };
}

function weekdaysInMonth(pattern: string, year: number, month: number): string[] {
  const weekday = parseWeekday(pattern);
  if (weekday === null) return [];

  const dates: string[] = [];
  for (let day = 1; day <= daysInMonth(year, month); day += 1) {
    const date = noonDate(year, month, day);
    if (date.getDay() === weekday) dates.push(isoDate(year, month, day));
  }
  return dates;
}

function isMonthInRange(rule: RecurringRule, year: number, month: number): boolean {
  const current = year * 12 + month;
  const start = rule.startYear * 12 + rule.startMonth;
  const end = rule.endYear === null || rule.endMonth === null ? Infinity : rule.endYear * 12 + rule.endMonth;
  return current >= start && current <= end;
}

function monthsFromStartTo(rule: RecurringRule, year: number, month: number): Array<{ year: number; month: number }> {
  const result: Array<{ year: number; month: number }> = [];
  const startIndex = rule.startYear * 12 + (rule.startMonth - 1);
  const endIndex = year * 12 + (month - 1);

  for (let index = startIndex; index <= endIndex; index += 1) {
    result.push({
      year: Math.floor(index / 12),
      month: (index % 12) + 1,
    });
  }

  return result;
}

function parseNumberList(pattern: string): number[] {
  return tokens(pattern)
    .map((token) => Number(token))
    .filter((value) => Number.isInteger(value));
}

function parseWeekday(pattern: string): number | null {
  const value = pattern.trim().toLowerCase();
  const number = Number(value);
  if (Number.isInteger(number) && number >= 0 && number <= 6) return number;
  const index = WEEKDAY_NAMES.findIndex((weekday) => weekday === value);
  return index === -1 ? null : index;
}

function tokens(pattern: string): string[] {
  return pattern
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
}

function parseIsoDate(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split("-").map((part) => Number(part));
  if (!year || !month || !day) throw new Error(`Ongeldige datum: ${iso}`);
  return { year, month, day };
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function noonDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function isValidDay(year: number, month: number, day: number): boolean {
  return Number.isInteger(day) && day >= 1 && day <= daysInMonth(year, month);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
