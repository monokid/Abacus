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

export interface SubcategoryUsage {
  entries: number;
  recurringRules: number;
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

export type RecurringRuleInput = Pick<
  RecurringRule,
  "section" | "subcategoryId" | "party" | "description" | "amountCents" | "startYear" | "startMonth" | "endYear" | "endMonth" | "frequency" | "pattern"
> &
  Partial<Pick<RecurringRule, "active" | "maxCount">>;

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
    subcategory("sub-vast-bank", "vaste_kosten", "Bankkosten", 50),
    subcategory("sub-vast-reserves", "vaste_kosten", "Sparen en reserves", 60),
    subcategory("sub-var-gezondheid", "variabele_kosten", "Gezondheid", 10),
    subcategory("sub-var-huishoudgeld", "variabele_kosten", "Huishoudgeld", 15),
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

export function allSubcategoriesFor(book: Book, section: Section): Subcategory[] {
  return [...book.subcategories]
    .filter((subcategoryItem) => subcategoryItem.section === section)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, "nl-BE"));
}

export function addSubcategory(book: Book, section: Section, rawName: string, idSeed = Date.now()): Subcategory {
  const name = normalizeSubcategoryName(rawName);
  assertSubcategoryNameAvailable(book, section, name);
  const siblings = allSubcategoriesFor(book, section);
  const sortOrder = siblings.reduce((highest, item) => Math.max(highest, item.sortOrder), 0) + 10;
  const prefix = section.replace("_kosten", "").replace("_", "-");
  const subcategoryItem: Subcategory = {
    id: uniqueSubcategoryId(book, `sub-${prefix}-${slugify(name) || "nieuw"}`, idSeed),
    section,
    name,
    sortOrder,
  };
  book.subcategories.push(subcategoryItem);
  return subcategoryItem;
}

export function renameSubcategory(book: Book, subcategoryId: string, rawName: string): Subcategory {
  const subcategoryItem = findSubcategory(book, subcategoryId);
  if (!subcategoryItem) throw new Error("Subcategorie niet gevonden.");
  const name = normalizeSubcategoryName(rawName);
  if (subcategoryItem.name === name) return subcategoryItem;
  assertSubcategoryNameAvailable(book, subcategoryItem.section, name, subcategoryItem.id);
  subcategoryItem.name = name;
  return subcategoryItem;
}

export function moveSubcategory(book: Book, subcategoryId: string, direction: -1 | 1): void {
  const subcategoryItem = findSubcategory(book, subcategoryId);
  if (!subcategoryItem) throw new Error("Subcategorie niet gevonden.");
  const siblings = allSubcategoriesFor(book, subcategoryItem.section);
  const index = siblings.findIndex((item) => item.id === subcategoryId);
  const swapIndex = index + direction;
  if (index < 0 || swapIndex < 0 || swapIndex >= siblings.length) return;

  const target = siblings[swapIndex];
  if (!target) return;
  const currentOrder = subcategoryItem.sortOrder;
  subcategoryItem.sortOrder = target.sortOrder;
  target.sortOrder = currentOrder;
  normalizeSubcategorySortOrder(book, subcategoryItem.section);
}

export function subcategoryUsage(book: Book, subcategoryId: string): SubcategoryUsage {
  let entries = 0;
  for (const year of book.years) {
    for (const month of year.months) {
      entries += month.entries.filter((entry) => entry.subcategoryId === subcategoryId).length;
    }
  }
  const recurringRules = book.recurringRules.filter((rule) => rule.subcategoryId === subcategoryId).length;
  return { entries, recurringRules };
}

export function addRecurringRule(book: Book, input: RecurringRuleInput, idSeed = Date.now()): RecurringRule {
  const rule = normalizeRecurringRuleInput(book, input);
  rule.id = uniqueRecurringRuleId(book, `rule-${slugify(rule.description) || "nieuw"}`, idSeed);
  book.recurringRules.push(rule);
  return rule;
}

export function updateRecurringRule(book: Book, ruleId: string, patch: Partial<RecurringRuleInput>): RecurringRule {
  const existing = book.recurringRules.find((rule) => rule.id === ruleId);
  if (!existing) throw new Error("Regel niet gevonden.");
  const next = normalizeRecurringRuleInput(book, { ...existing, ...patch });
  Object.assign(existing, { ...next, id: existing.id });
  return existing;
}

export function validateBook(book: Book): string[] {
  const issues: string[] = [];
  const validFrequencies = new Set<RecurringFrequency>(["monthly", "quarterly", "yearly", "months", "dates", "weekday"]);

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
    if (!Number.isFinite(item.sortOrder) || !Number.isInteger(item.sortOrder)) {
      issues.push(`Subcategorie '${item.name}' heeft een ongeldige volgorde.`);
    }
  }

  for (const section of SECTIONS) {
    const names = new Set<string>();
    for (const item of (book.subcategories ?? []).filter((subcategoryItem) => subcategoryItem.section === section)) {
      const normalizedName = item.name.trim().toLocaleLowerCase("nl-BE");
      if (!normalizedName) continue;
      if (names.has(normalizedName)) issues.push(`Dubbele subcategorie '${item.name}' in ${section}.`);
      names.add(normalizedName);
    }
  }

  const ruleIds = new Set<string>();
  for (const rule of book.recurringRules ?? []) {
    if (!rule.id) issues.push("Terugkerende regel zonder id.");
    if (ruleIds.has(rule.id)) issues.push(`Dubbele terugkerende regel-id: ${rule.id}.`);
    ruleIds.add(rule.id);
    if (!isSection(rule.section)) issues.push(`Terugkerende regel '${rule.id}' heeft een onbekende hoofdgroep.`);
    if (!validFrequencies.has(rule.frequency)) issues.push(`Terugkerende regel '${rule.id}' heeft een onbekende herhaling.`);
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
    if ((rule.endYear === null) !== (rule.endMonth === null)) {
      issues.push(`Terugkerende regel '${rule.id}' heeft een onvolledige einddatum.`);
    }
    if (rule.endYear !== null && !Number.isInteger(rule.endYear)) {
      issues.push(`Terugkerende regel '${rule.id}' heeft een ongeldig eindjaar.`);
    }
    if (rule.endMonth !== null && (!Number.isInteger(rule.endMonth) || rule.endMonth < 1 || rule.endMonth > 12)) {
      issues.push(`Terugkerende regel '${rule.id}' heeft een ongeldige eindmaand.`);
    }
    if (rule.maxCount !== null && (!Number.isInteger(rule.maxCount) || rule.maxCount < 1)) {
      issues.push(`Terugkerende regel '${rule.id}' heeft een ongeldig maximum.`);
    }
  }

  for (const skip of book.recurringSkips ?? []) {
    if (!skip.ruleId) issues.push("Overgeslagen terugkerende regel zonder regel-id.");
    if (skip.ruleId && !ruleIds.has(skip.ruleId)) issues.push(`Overgeslagen terugkerende regel '${skip.ruleId}' bestaat niet.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(skip.date)) issues.push(`Overgeslagen terugkerende regel '${skip.ruleId}' heeft een ongeldige datum.`);
    if (!skip.skippedAt) issues.push(`Overgeslagen terugkerende regel '${skip.ruleId}' heeft geen tijdstip.`);
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

function findSubcategory(book: Book, subcategoryId: string): Subcategory | undefined {
  return book.subcategories.find((item) => item.id === subcategoryId);
}

function normalizeSubcategoryName(rawName: string): string {
  const name = rawName.trim().replace(/\s+/g, " ");
  if (!name) throw new Error("Subcategorie heeft een naam nodig.");
  return name;
}

function assertSubcategoryNameAvailable(book: Book, section: Section, name: string, exceptId?: string): void {
  const normalizedName = name.toLocaleLowerCase("nl-BE");
  const duplicate = book.subcategories.find(
    (item) => item.section === section && item.id !== exceptId && item.name.trim().toLocaleLowerCase("nl-BE") === normalizedName,
  );
  if (duplicate) throw new Error("Deze subcategorie bestaat al in deze hoofdgroep.");
}

function uniqueSubcategoryId(book: Book, baseId: string, idSeed: number): string {
  const existingIds = new Set(book.subcategories.map((item) => item.id));
  if (!existingIds.has(baseId)) return baseId;
  let suffix = Math.abs(Math.trunc(idSeed));
  let candidate = `${baseId}-${suffix}`;
  while (existingIds.has(candidate)) {
    suffix += 1;
    candidate = `${baseId}-${suffix}`;
  }
  return candidate;
}

function uniqueRecurringRuleId(book: Book, baseId: string, idSeed: number): string {
  const existingIds = new Set(book.recurringRules.map((rule) => rule.id));
  if (!existingIds.has(baseId)) return baseId;
  let suffix = Math.abs(Math.trunc(idSeed));
  let candidate = `${baseId}-${suffix}`;
  while (existingIds.has(candidate)) {
    suffix += 1;
    candidate = `${baseId}-${suffix}`;
  }
  return candidate;
}

function normalizeRecurringRuleInput(book: Book, input: RecurringRuleInput): RecurringRule {
  if (!isSection(input.section)) throw new Error("Hoofdgroep is ongeldig.");
  const subcategoryId = input.subcategoryId || null;
  if (subcategoryId) {
    const subcategoryItem = book.subcategories.find((item) => item.id === subcategoryId);
    if (!subcategoryItem || subcategoryItem.section !== input.section) throw new Error("Subcategorie past niet bij deze hoofdgroep.");
  }

  const description = input.description.trim().replace(/\s+/g, " ");
  if (!description) throw new Error("Regel heeft een omschrijving nodig.");
  if (input.amountCents !== null && !Number.isInteger(input.amountCents)) throw new Error("Bedrag moet een geheel aantal cent zijn.");
  if (!Number.isInteger(input.startYear)) throw new Error("Startjaar is ongeldig.");
  if (!Number.isInteger(input.startMonth) || input.startMonth < 1 || input.startMonth > 12) throw new Error("Startmaand is ongeldig.");
  if ((input.endYear === null) !== (input.endMonth === null)) throw new Error("Einddatum is onvolledig.");
  if (input.endYear !== null && !Number.isInteger(input.endYear)) throw new Error("Eindjaar is ongeldig.");
  if (input.endMonth !== null && (!Number.isInteger(input.endMonth) || input.endMonth < 1 || input.endMonth > 12)) throw new Error("Eindmaand is ongeldig.");
  if (input.maxCount !== undefined && input.maxCount !== null && (!Number.isInteger(input.maxCount) || input.maxCount < 1)) {
    throw new Error("Maximum aantal is ongeldig.");
  }

  return {
    id: "",
    active: input.active ?? true,
    section: input.section,
    subcategoryId,
    party: input.party.trim().replace(/\s+/g, " "),
    description,
    amountCents: input.amountCents,
    startYear: input.startYear,
    startMonth: input.startMonth,
    endYear: input.endYear,
    endMonth: input.endMonth,
    maxCount: input.maxCount ?? null,
    frequency: input.frequency,
    pattern: input.pattern.trim(),
  };
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSubcategorySortOrder(book: Book, section: Section): void {
  allSubcategoriesFor(book, section).forEach((item, index) => {
    item.sortOrder = (index + 1) * 10;
  });
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
