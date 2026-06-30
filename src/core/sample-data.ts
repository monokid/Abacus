import type { Section } from "./sections";
import type { Book, BudgetYear, Entry, RecurringRule, Subcategory } from "./model";
import { createEmptyBook, defaultSubcategories } from "./model";
import { datesFor, expandTemplate } from "./recurring";

const DEMO_YEAR = 2026;

export function fictionalSampleBook(): Book {
  const book = createEmptyBook(DEMO_YEAR);
  const year = book.years[0];
  if (!year) return book;

  year.startBalanceCents = eur("4670,10");
  book.subcategories = demoSubcategories();
  book.recurringRules = fictionalRecurringRules();

  let order = 1;
  for (const ruleItem of book.recurringRules) {
    for (const month of year.months) {
      for (const date of datesFor(ruleItem, year.year, month.month)) {
        month.entries.push(entryFromRule(ruleItem, date, order++));
      }
    }
  }

  addExcelLikeOneOffs(year, order);

  book.labels = {
    parties: [
      "Pensioendienst",
      "Pensioenkas",
      "FPD",
      "Mutualiteit",
      "Cash",
      "Aldi",
      "Spar",
      "Lampiris",
      "Telenet",
      "KBC",
      "PAJS",
      "Nespresso",
      "Multipharma",
      "Cosmetica",
      "F-Secure",
      "Bubar",
      "De Lijn",
      "Provincie",
      "Farel",
      "Hotel BilBerge",
      "Tuincentrum",
    ],
    income: ["Pensioen", "Pensioen L", "Eretekens", "HOSPI+", "Mutualiteit", "Bijdrage familie"],
    expense: [
      "HH",
      "Aldi",
      "Spar",
      "Lampiris",
      "Telenet",
      "KBC",
      "PAJS",
      "Spaar 23",
      "Spaar hospi",
      "Spaar vac",
      "Spaar res",
      "Nespresso",
      "Multipharma",
      "Cosmetica",
      "F-Secure",
      "Bubar",
      "Bijdrage",
      "Zilver card",
      "Zakgeld MM",
      "Ferm tuinhuis",
    ],
  };

  return book;
}

export function fictionalRecurringRules(): RecurringRule[] {
  return [
    rule("rule-pensioen", "inkomsten", "sub-ink-pensioen", "Pensioendienst", "Pensioen", eur("3179,10")),
    rule("rule-pensioen-l", "inkomsten", "sub-ink-pensioen", "Pensioenkas", "Pensioen L", eur("63,31")),
    rule("rule-eretekens", "inkomsten", "sub-ink-pensioen", "FPD", "Eretekens", eur("2,58")),
    rule("rule-hh-weekgeld", "vaste_kosten", "sub-vast-hh", "Cash", "HH", eur("90,00"), {
      frequency: "dates",
      pattern: "1,8,15,22,29",
    }),
    rule("rule-lampiris", "vaste_kosten", "sub-vast-divers", "Lampiris", "Egie", eur("200,00")),
    rule("rule-telenet", "vaste_kosten", "sub-vast-divers", "Telenet", "Telenet", eur("100,00")),
    rule("rule-kbc", "vaste_kosten", "sub-vast-divers", "KBC", "KBC", eur("4,75")),
    rule("rule-pajs", "vaste_kosten", "sub-vast-divers", "PAJS", "PAJS", eur("30,00")),
    rule("rule-spaar-23", "vaste_kosten", "sub-vast-reserves", "Spaarrekening", "Spaar 23", eur("250,00")),
    rule("rule-spaar-hospi", "vaste_kosten", "sub-vast-reserves", "Spaarrekening", "Spaar hospi", eur("250,00")),
    rule("rule-spaar-vac", "vaste_kosten", "sub-vast-reserves", "Spaarrekening", "Spaar vac", eur("122,00")),
    rule("rule-spaar-res", "vaste_kosten", "sub-vast-reserves", "Spaarrekening", "Spaar res", eur("500,00")),
    rule("rule-bubar", "vaste_kosten", "sub-vast-bubar", "Bubar", "Bubar", eur("100,00")),
    rule("rule-bijdrage", "vaste_kosten", "sub-vast-bubar", "Familie", "Bijdrage", eur("17,58")),
    oneOffRule("rule-belastingcorrectie", "inkomsten", "sub-ink-terugbetalingen", "Mutualiteit", "HOSPI+", eur("377,00"), "01/07"),
    oneOffRule("rule-augustus-mutualiteit", "inkomsten", "sub-ink-terugbetalingen", "Mutualiteit", "Mutualiteit", eur("400,00"), "01/08"),
    oneOffRule("rule-f-secure", "variabele_kosten", "sub-var-huishouden", "F-Secure", "F secure", eur("80,00"), "01/07"),
  ];
}

function demoSubcategories(): Subcategory[] {
  return [
    ...defaultSubcategories(),
    { id: "sub-vast-hh", section: "vaste_kosten", name: "HH", sortOrder: 5 },
    { id: "sub-vast-aldi", section: "vaste_kosten", name: "Aldi", sortOrder: 12 },
    { id: "sub-vast-spar", section: "vaste_kosten", name: "Spar", sortOrder: 14 },
    { id: "sub-vast-divers", section: "vaste_kosten", name: "Divers", sortOrder: 35 },
    { id: "sub-vast-bubar", section: "vaste_kosten", name: "Bubar / Bijdrage", sortOrder: 65 },
    { id: "sub-var-koffie", section: "variabele_kosten", name: "Koffie", sortOrder: 22 },
    { id: "sub-var-belastingen", section: "variabele_kosten", name: "Belastingen", sortOrder: 42 },
  ];
}

function addExcelLikeOneOffs(year: BudgetYear, firstOrder: number): void {
  let order = firstOrder;
  const add = (
    month: number,
    section: Section,
    subcategoryId: string,
    party: string,
    description: string,
    amount: string,
    comment = "",
  ) => {
    const targetMonth = year.months[month - 1];
    if (!targetMonth) return;
    targetMonth.entries.push({
      id: `demo-${month}-${order}`,
      section,
      subcategoryId,
      date: `${year.year}-${String(month).padStart(2, "0")}-15`,
      party,
      description,
      amountCents: eur(amount),
      comment,
      createdAt: Date.UTC(year.year, month - 1, order++),
    });
  };

  add(1, "vaste_kosten", "sub-vast-aldi", "Aldi", "Aldi", "120,00");
  add(1, "variabele_kosten", "sub-var-koffie", "Nespresso", "Nespresso", "45,00");
  add(1, "variabele_kosten", "sub-var-gezondheid", "Multipharma", "Multipharma", "200,00");
  add(1, "variabele_kosten", "sub-var-huishouden", "Cosmetica", "Cosmetica", "70,00");
  add(2, "vaste_kosten", "sub-vast-spar", "Spar", "Spar", "50,00");
  add(2, "variabele_kosten", "sub-var-koffie", "Nespresso", "Nespresso", "45,00");
  add(2, "variabele_kosten", "sub-var-cadeaus", "Familie", "Verjaardag", "150,00");
  add(3, "inkomsten", "sub-ink-terugbetalingen", "Mutualiteit", "Kine terugbetaling", "110,67");
  add(3, "vaste_kosten", "sub-vast-aldi", "Aldi", "Aldi extra", "90,00");
  add(3, "variabele_kosten", "sub-var-gezondheid", "Apotheek", "Omsl Dr Apo", "20,00");
  add(4, "vaste_kosten", "sub-vast-spar", "Spar", "Spar", "50,00");
  add(4, "variabele_kosten", "sub-var-huishouden", "Gamma", "Mierenpoeder", "12,70");
  add(4, "variabele_kosten", "sub-var-koffie", "Nespresso", "Ontkalker", "9,00");
  add(5, "vaste_kosten", "sub-vast-divers", "De Lijn", "De Lijn", "51,00");
  add(5, "variabele_kosten", "sub-var-huishouden", "123inkt", "Inkt PC", "61,20");
  add(5, "variabele_kosten", "sub-var-auto", "Tankstation", "Naft", "40,00");
  add(6, "vaste_kosten", "sub-vast-aldi", "Aldi", "Aldi", "200,00");
  add(6, "vaste_kosten", "sub-vast-aldi", "Aldi", "Aldi", "200,00");
  add(6, "variabele_kosten", "sub-var-huishouden", "F-Secure", "F secure", "80,00");
  add(6, "variabele_kosten", "sub-var-gezondheid", "Multipharma", "Multipharma", "200,00");
  add(6, "variabele_kosten", "sub-var-huishouden", "Cosmetica", "Cosmetica", "70,00");

  add(7, "vaste_kosten", "sub-vast-aldi", "Aldi", "Aldi", "200,00");
  add(7, "vaste_kosten", "sub-vast-aldi", "Aldi", "Aldi", "200,00");
  add(7, "vaste_kosten", "sub-vast-aldi", "Aldi", "Aldi", "200,00");
  add(7, "vaste_kosten", "sub-vast-spar", "Spar", "Spar", "50,00");
  add(7, "vaste_kosten", "sub-vast-spar", "Spar", "Spar", "50,00");
  add(7, "vaste_kosten", "sub-vast-spar", "Spar", "Spar", "50,00");
  add(7, "vaste_kosten", "sub-vast-spar", "Spar", "Spar", "50,00");
  add(7, "variabele_kosten", "sub-var-koffie", "Nespresso", "Nespresso", "48,00");
  add(7, "variabele_kosten", "sub-var-huishouden", "Philips", "mult-phil", "400,88");
  add(7, "variabele_kosten", "sub-var-gezondheid", "Multipharma", "Multipharma", "200,00");
  add(7, "variabele_kosten", "sub-var-huishouden", "Cosmetica", "Cosmetica", "70,00");

  add(8, "vaste_kosten", "sub-vast-aldi", "Aldi", "Aldi", "200,00");
  add(8, "vaste_kosten", "sub-vast-aldi", "Aldi", "Aldi", "200,00");
  add(8, "vaste_kosten", "sub-vast-spar", "Spar", "Spar", "50,00");
  add(8, "vaste_kosten", "sub-vast-spar", "Spar", "Spar", "50,00");
  add(8, "vaste_kosten", "sub-vast-spar", "Spar", "Spar", "50,00");
  add(8, "vaste_kosten", "sub-vast-divers", "ZONW", "ZONW", "50,00");
  add(8, "vaste_kosten", "sub-vast-bubar", "Zilver card", "Zilver card", "85,00");
  add(8, "variabele_kosten", "sub-var-belastingen", "Provincie", "prov belast", "35,00");
  add(8, "variabele_kosten", "sub-var-huishouden", "De Lijn", "de lijn", "70,00");
  add(8, "variabele_kosten", "sub-var-cadeaus", "Farel", "Farel", "200,00");
  add(8, "variabele_kosten", "sub-var-cadeaus", "Hotel BilBerge", "hotel BilBerge", "360,00");
  add(8, "variabele_kosten", "sub-var-huishouden", "Cash", "zakgeld MM", "300,00");
  add(8, "variabele_kosten", "sub-var-huishouden", "Ferm", "Ferm tuinhuis", "176,00");

  add(9, "variabele_kosten", "sub-var-gezondheid", "Labo", "labo E", "25,00");
  add(9, "variabele_kosten", "sub-var-koffie", "Nespresso", "Nespresso", "50,00");
  add(9, "variabele_kosten", "sub-var-huishouden", "Tuincentrum", "Tuincentr", "149,83");
  add(10, "variabele_kosten", "sub-var-belastingen", "Provincie", "Onroer VR", "950,00");
  add(10, "variabele_kosten", "sub-var-gezondheid", "Pedicure", "Pedicure", "45,00");
  add(11, "vaste_kosten", "sub-vast-spar", "Spar", "Spar", "50,00");
  add(11, "variabele_kosten", "sub-var-koffie", "Nespresso", "Nespresso", "42,80");
  add(12, "vaste_kosten", "sub-vast-aldi", "Aldi", "Aldi", "90,00");
  add(12, "variabele_kosten", "sub-var-cadeaus", "Familie", "Eindejaarscadeau", "250,00");
}

function rule(
  id: string,
  section: Entry["section"],
  subcategoryId: string,
  party: string,
  description: string,
  amountCents: number,
  overrides: Partial<Pick<RecurringRule, "frequency" | "pattern" | "maxCount" | "startMonth" | "endMonth">> = {},
): RecurringRule {
  return {
    id,
    active: true,
    section,
    subcategoryId,
    party,
    description,
    amountCents,
    startYear: 2026,
    startMonth: overrides.startMonth ?? 1,
    endYear: 2026,
    endMonth: overrides.endMonth ?? 12,
    maxCount: overrides.maxCount ?? null,
    frequency: overrides.frequency ?? "monthly",
    pattern: overrides.pattern ?? "",
  };
}

function oneOffRule(
  id: string,
  section: Entry["section"],
  subcategoryId: string,
  party: string,
  description: string,
  amountCents: number | null,
  datePattern: string,
): RecurringRule {
  return {
    ...rule(id, section, subcategoryId, party, description, amountCents ?? 0),
    amountCents,
    frequency: "dates",
    pattern: datePattern,
    maxCount: 1,
  };
}

function entryFromRule(ruleItem: RecurringRule, date: string, order: number): Entry {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  return {
    id: `${ruleItem.id}-${date}`,
    section: ruleItem.section,
    subcategoryId: ruleItem.subcategoryId,
    date,
    party: ruleItem.party,
    description: expandTemplate(ruleItem.description, date),
    amountCents: ruleItem.amountCents,
    comment: "",
    createdAt: Date.UTC(year, month - 1, order),
  };
}

function eur(value: string): number {
  return Math.round(Number(value.replace(/\./g, "").replace(",", ".")) * 100);
}
