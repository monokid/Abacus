import type { Book, Entry, RecurringRule } from "./model";
import { createEmptyBook } from "./model";
import { datesFor, expandTemplate } from "./recurring";

const DEMO_YEAR = 2026;

export function fictionalSampleBook(): Book {
  const book = createEmptyBook(DEMO_YEAR);
  const year = book.years[0];
  if (!year) return book;

  year.startBalanceCents = 221_881;
  book.recurringRules = fictionalRecurringRules();

  let order = 1;
  for (const rule of book.recurringRules) {
    for (const month of year.months) {
      for (const date of datesFor(rule, year.year, month.month)) {
        month.entries.push(entryFromRule(rule, date, order++));
      }
    }
  }

  book.labels = {
    parties: [
      "Pensioendienst",
      "Pensioenkas",
      "Familie",
      "Woonfonds",
      "Luminus",
      "Telenet",
      "Bank",
      "Spaarpot",
      "Cash",
      "Apotheek",
      "Garage",
      "Mutualiteit",
      "Verzekeraar",
      "Tandarts",
      "Tankstation",
    ],
    income: ["Pensioen", "Aanvullend pensioen", "Bijdrage familie", "Terugbetaling zorg", "Correctie aanslag"],
    expense: [
      "Huur",
      "Voorschot energie",
      "Internet en telefoon",
      "Rekeningkosten",
      "Reserve vakantie",
      "Huishoudgeld",
      "Medicatie",
      "Verjaardag",
      "Nog te plannen",
      "Brandstof",
    ],
  };

  return book;
}

export function fictionalRecurringRules(): RecurringRule[] {
  return [
    rule("rule-pension", "inkomsten", "sub-ink-pensioen", "Pensioendienst", "Pensioen", 233_259),
    rule("rule-small-pension", "inkomsten", "sub-ink-pensioen", "Pensioenkas", "Aanvullend pensioen", 6_331),
    rule("rule-rent", "vaste_kosten", "sub-vast-wonen", "Woonfonds", "Huur", 82_000),
    rule("rule-energy", "vaste_kosten", "sub-vast-energie", "Luminus", "Voorschot energie", 15_431),
    rule("rule-telecom", "vaste_kosten", "sub-vast-telecom", "Telenet", "Internet en telefoon", 7_643),
    rule("rule-bank", "vaste_kosten", "sub-vast-bank", "Bank", "Rekeningkosten", 475),
    rule("rule-reserve", "vaste_kosten", "sub-vast-reserves", "Spaarpot", "Reserve vakantie", 5_000),
    rule("rule-household-cash", "variabele_kosten", "sub-var-huishoudgeld", "Cash", "Huishoudgeld", 20_000),
    oneOffRule("rule-family-contribution", "inkomsten", "sub-ink-familie", "Familie", "Bijdrage familie", 4_894, "01/01"),
    oneOffRule("rule-health-medicine", "variabele_kosten", "sub-var-gezondheid", "Apotheek", "Medicatie", 3_780, "12/01"),
    oneOffRule("rule-household-extra", "variabele_kosten", "sub-var-huishouden", "Buurtwinkel", "Keukenmateriaal", 4_050, "15/01"),
    oneOffRule("rule-birthday-gift", "variabele_kosten", "sub-var-cadeaus", "Familie", "Verjaardag", 5_000, "18/02"),
    oneOffRule("rule-planned-garage", "variabele_kosten", "sub-var-auto", "Garage", "Nog te plannen", null, "20/02"),
    oneOffRule("rule-care-refund", "inkomsten", "sub-ink-terugbetalingen", "Mutualiteit", "Terugbetaling zorg", 4_870, "01/03"),
    oneOffRule("rule-dentist", "variabele_kosten", "sub-var-gezondheid", "Tandarts", "Controle", 6_500, "12/03"),
    oneOffRule("rule-tax-correction", "inkomsten", "sub-ink-terugbetalingen", "Belastingdienst", "Correctie aanslag", 12_400, "01/05"),
    oneOffRule("rule-small-appliance", "variabele_kosten", "sub-var-huishouden", "Winkel", "Klein toestel", 8_995, "01/06"),
    oneOffRule("rule-fuel", "variabele_kosten", "sub-var-auto", "Tankstation", "Brandstof", 6_875, "01/08"),
    oneOffRule("rule-annual-insurance", "vaste_kosten", "sub-vast-verzekeringen", "Verzekeraar", "Jaarlijkse verzekering", 29_900, "01/10"),
    oneOffRule("rule-year-end-gift", "variabele_kosten", "sub-var-cadeaus", "Familie", "Eindejaarscadeau", 7_500, "01/12"),
  ];
}

function rule(
  id: string,
  section: Entry["section"],
  subcategoryId: string,
  party: string,
  description: string,
  amountCents: number,
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
    startMonth: 1,
    endYear: 2026,
    endMonth: 12,
    maxCount: null,
    frequency: "monthly",
    pattern: "",
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

function entryFromRule(rule: RecurringRule, date: string, order: number): Entry {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  return {
    id: `${rule.id}-${date}`,
    section: rule.section,
    subcategoryId: rule.subcategoryId,
    date,
    party: rule.party,
    description: expandTemplate(rule.description, date),
    amountCents: rule.amountCents,
    comment: "Aangemaakt uit demoregel.",
    createdAt: Date.UTC(year, month - 1, order),
  };
}
