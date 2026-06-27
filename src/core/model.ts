import { SECTIONS, isSection, type Section } from "./sections";

export const SCHEMA_VERSION = 1;

export interface Book {
  schemaVersion: number;
  settings: Settings;
  years: BudgetYear[];
  subcategories: Subcategory[];
  labels: LabelSettings;
  recurringRules: RecurringRule[];
  recurringSkips: RecurringSkip[];
}

export interface Settings {
  themeMode: "light" | "evening";
  locale: "nl-BE";
  currency: "EUR";
}

export interface LabelSettings {
  parties: string[];
  income: string[];
  expense: string[];
}

export interface Subcategory {
  id: string;
  section: Section;
  name: string;
  sortOrder: number;
  hidden?: boolean;
}

export type RecurringFrequency = "monthly" | "quarterly" | "yearly" | "months" | "dates" | "weekday";

export interface RecurringRule {
  id: string;
  active: boolean;
  section: Section;
  subcategoryId: string | null;
  party: string;
  description: string;
  amountCents: number | null;
  startYear: number;
  startMonth: number;
  endYear: number | null;
  endMonth: number | null;
  maxCount: number | null;
  frequency: RecurringFrequency;
  pattern: string;
}

export interface RecurringSkip {
  ruleId: string;
  date: string;
  skippedAt: string;
}

export interface BudgetYear {
  year: number;
  startBalanceCents: number;
  months: BudgetMonth[];
  trashed: boolean;
  deletedAt: string | null;
}

export interface BudgetMonth {
  month: number;
  locked: boolean;
  entries: Entry[];
}

export interface Entry {
  id: string;
  section: Section;
  subcategoryId: string | null;
  date: string;
  party: string;
  description: string;
  amountCents: number | null;
  comment: string;
  createdAt: number;
}

export function createEmptyBook(year = new Date().getFullYear()): Book {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: {
      themeMode: "light",
      locale: "nl-BE",
      currency: "EUR",
    },
    labels: {
      parties: [],
      income: [],
      expense: [],
    },
    subcategories: defaultSubcategories(),
    recurringRules: [],
    recurringSkips: [],
    years: [createYear(year, 0)],
  };
}

export function createYear(year: number, startBalanceCents: number): BudgetYear {
  return {
    year,
    startBalanceCents,
    trashed: false,
    deletedAt: null,
    months: Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      locked: false,
      entries: [],
    })),
  };
}

export function defaultSubcategories(): Subcategory[] {
  return [
    subcategory("sub-ink-pensioen", "inkomsten", "Pensioen", 10),
    subcategory("sub-ink-terugbetalingen", "inkomsten", "Terugbetalingen", 20),
    subcategory("sub-ink-familie", "inkomsten", "Familie", 30),
    subcategory("sub-vast-wonen", "vaste_kosten", "Wonen", 10),
    subcategory("sub-vast-energie", "vaste_kosten", "Energie", 20),
    subcategory("sub-vast-telecom", "vaste_kosten", "Telecom", 30),
    subcategory("sub-vast-verzekeringen", "vaste_kosten", "Verzekeringen", 40),
    subcategory("sub-var-gezondheid", "variabele_kosten", "Gezondheid", 10),
    subcategory("sub-var-huishouden", "variabele_kosten", "Huishouden", 20),
    subcategory("sub-var-cadeaus", "variabele_kosten", "Cadeaus", 30),
    subcategory("sub-var-auto", "variabele_kosten", "Auto", 40),
  ];
}

export function subcategoriesFor(book: Book, section: Section): Subcategory[] {
  return [...book.subcategories]
    .filter((subcategoryItem) => subcategoryItem.section === section && !subcategoryItem.hidden)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, "nl-BE"));
}

export function validateBook(book: Book): string[] {
  const issues: string[] = [];

  if (book.schemaVersion !== SCHEMA_VERSION) issues.push("Onbekende schemaversie.");
  if (book.settings.locale !== "nl-BE") issues.push("Ongeldige taalinstelling.");
  if (book.settings.currency !== "EUR") issues.push("Ongeldige muntinstelling.");
  if (!Array.isArray(book.years) || book.years.length === 0) issues.push("Minstens een jaar is vereist.");
  if (!Array.isArray(book.subcategories)) issues.push("Subcategorieen ontbreken.");

  const subcategoryIds = new Set<string>();
  for (const item of book.subcategories ?? []) {
    if (!item.id) issues.push("Subcategorie zonder id.");
    if (subcategoryIds.has(item.id)) issues.push(`Dubbele subcategorie-id: ${item.id}.`);
    subcategoryIds.add(item.id);
    if (!isSection(item.section)) issues.push(`Subcategorie '${item.name}' heeft een onbekende hoofdgroep.`);
    if (!item.name.trim()) issues.push(`Subcategorie '${item.id}' heeft geen naam.`);
  }

  for (const rule of book.recurringRules ?? []) {
    if (!rule.id) issues.push("Terugkerende regel zonder id.");
    if (!isSection(rule.section)) issues.push(`Terugkerende regel '${rule.id}' heeft een onbekende hoofdgroep.`);
    if (rule.subcategoryId) {
      const match = book.subcategories.find((item) => item.id === rule.subcategoryId);
      if (!match) issues.push(`Terugkerende regel '${rule.id}' verwijst naar een onbekende subcategorie.`);
      if (match && match.section !== rule.section) {
        issues.push(`Terugkerende regel '${rule.id}' gebruikt een subcategorie uit de verkeerde hoofdgroep.`);
      }
    }
    if (!rule.description.trim()) issues.push(`Terugkerende regel '${rule.id}' heeft geen label.`);
    if (rule.amountCents !== null && !Number.isInteger(rule.amountCents)) {
      issues.push(`Terugkerende regel '${rule.id}' heeft geen geheel aantal cent.`);
    }
    if (!Number.isInteger(rule.startYear)) issues.push(`Terugkerende regel '${rule.id}' heeft een ongeldig startjaar.`);
    if (!Number.isInteger(rule.startMonth) || rule.startMonth < 1 || rule.startMonth > 12) {
      issues.push(`Terugkerende regel '${rule.id}' heeft een ongeldige startmaand.`);
    }
  }

  for (const year of book.years ?? []) {
    if (!Number.isInteger(year.year)) issues.push("Jaar is geen geheel getal.");
    if (!Number.isInteger(year.startBalanceCents)) issues.push(`Startsaldo van ${year.year} is geen geheel aantal cent.`);
    if (year.months.length !== 12) issues.push(`${year.year} heeft niet exact 12 maanden.`);

    const monthNumbers = new Set<number>();
    for (const month of year.months) {
      if (!Number.isInteger(month.month) || month.month < 1 || month.month > 12) {
        issues.push(`${year.year} bevat een ongeldige maand.`);
      }
      if (monthNumbers.has(month.month)) issues.push(`${year.year} bevat maand ${month.month} dubbel.`);
      monthNumbers.add(month.month);

      for (const entry of month.entries) {
        if (!entry.id) issues.push("Boekingsregel zonder id.");
        if (!isSection(entry.section)) issues.push(`Boekingsregel '${entry.id}' heeft een onbekende hoofdgroep.`);
        if (entry.subcategoryId) {
          const match = book.subcategories.find((item) => item.id === entry.subcategoryId);
          if (!match) issues.push(`Boekingsregel '${entry.id}' verwijst naar een onbekende subcategorie.`);
          if (match && match.section !== entry.section) {
            issues.push(`Boekingsregel '${entry.id}' gebruikt een subcategorie uit de verkeerde hoofdgroep.`);
          }
        }
        if (entry.amountCents !== null && !Number.isInteger(entry.amountCents)) {
          issues.push(`Boekingsregel '${entry.id}' heeft geen geheel aantal cent.`);
        }
      }
    }
  }

  return issues;
}

function subcategory(id: string, section: Section, name: string, sortOrder: number): Subcategory {
  return { id, section, name, sortOrder };
}

export function sectionFromDutchLabel(label: string): Section | null {
  const normalized = label.trim().toLowerCase();
  for (const section of SECTIONS) {
    if (normalized === section.replace("_", " ")) return section;
  }
  if (normalized === "inkomsten") return "inkomsten";
  if (normalized === "vaste kosten") return "vaste_kosten";
  if (normalized === "variabele kosten") return "variabele_kosten";
  return null;
}
