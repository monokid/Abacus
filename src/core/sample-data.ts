import type { Book, Entry } from "./model";
import { createEmptyBook } from "./model";

export function fictionalSampleBook(): Book {
  const book = createEmptyBook(2026);
  const year = book.years[0];
  if (!year) return book;

  year.startBalanceCents = 221_881;

  let order = 1;
  for (const month of year.months) {
    const monthNumber = month.month;
    month.entries = [
      entry(`m${monthNumber}-income-pension`, "inkomsten", "sub-ink-pensioen", monthNumber, "Pensioendienst", "Pensioen", 233_259, order++),
      entry(`m${monthNumber}-income-small-pension`, "inkomsten", "sub-ink-pensioen", monthNumber, "Pensioenkas", "Aanvullend pensioen", 6_331, order++),
      entry(`m${monthNumber}-rent`, "vaste_kosten", "sub-vast-wonen", monthNumber, "Woonfonds", "Huur", 82_000, order++),
      entry(`m${monthNumber}-energy`, "vaste_kosten", "sub-vast-energie", monthNumber, "Luminus", "Voorschot energie", 15_431, order++),
      entry(`m${monthNumber}-telecom`, "vaste_kosten", "sub-vast-telecom", monthNumber, "Telenet", "Internet en telefoon", 7_643, order++),
      entry(`m${monthNumber}-bank`, "vaste_kosten", "sub-vast-bank", monthNumber, "Bank", "Rekeningkosten", 475, order++),
      entry(`m${monthNumber}-reserve`, "vaste_kosten", "sub-vast-reserves", monthNumber, "Spaarpot", "Reserve vakantie", 5_000, order++),
      entry(`m${monthNumber}-cash`, "variabele_kosten", "sub-var-huishoudgeld", monthNumber, "Cash", "Huishoudgeld", 20_000, order++),
    ];
  }

  addEntry(year, 1, entry("jan-income-family", "inkomsten", "sub-ink-familie", 1, "Familie", "Bijdrage familie", 4_894, order++));
  addEntry(year, 1, entry("jan-health", "variabele_kosten", "sub-var-gezondheid", 1, "Apotheek", "Medicatie", 3_780, order++));
  addEntry(year, 1, entry("jan-household-extra", "variabele_kosten", "sub-var-huishouden", 1, "Buurtwinkel", "Keukenmateriaal", 4_050, order++));

  addEntry(year, 2, entry("feb-gift", "variabele_kosten", "sub-var-cadeaus", 2, "Familie", "Verjaardag", 5_000, order++));
  addEntry(year, 2, entry("feb-empty-plan", "variabele_kosten", "sub-var-auto", 2, "Garage", "Nog te plannen", null, order++, "Geplande kost zonder bedrag."));

  addEntry(year, 3, entry("mar-refund", "inkomsten", "sub-ink-terugbetalingen", 3, "Mutualiteit", "Terugbetaling zorg", 4_870, order++));
  addEntry(year, 3, entry("mar-dentist", "variabele_kosten", "sub-var-gezondheid", 3, "Tandarts", "Controle", 6_500, order++));

  addEntry(year, 5, entry("may-correction", "inkomsten", "sub-ink-terugbetalingen", 5, "Belastingdienst", "Correctie aanslag", 12_400, order++, "Voorbeeld van een latere correctieregel."));
  addEntry(year, 6, entry("jun-appliance", "variabele_kosten", "sub-var-huishouden", 6, "Winkel", "Klein toestel", 8_995, order++));
  addEntry(year, 8, entry("aug-fuel", "variabele_kosten", "sub-var-auto", 8, "Tankstation", "Brandstof", 6_875, order++));
  addEntry(year, 10, entry("oct-insurance", "vaste_kosten", "sub-vast-verzekeringen", 10, "Verzekeraar", "Jaarlijkse verzekering", 29_900, order++));
  addEntry(year, 12, entry("dec-gift", "variabele_kosten", "sub-var-cadeaus", 12, "Familie", "Eindejaarscadeau", 7_500, order++));

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

function addEntry(year: Book["years"][number], monthNumber: number, row: Entry): void {
  year.months[monthNumber - 1]?.entries.push(row);
}

function entry(
  id: string,
  section: Entry["section"],
  subcategoryId: string | null,
  month: number,
  party: string,
  description: string,
  amountCents: number | null,
  order: number,
  comment = "",
): Entry {
  return {
    id,
    section,
    subcategoryId,
    date: `2026-${String(month).padStart(2, "0")}-01`,
    party,
    description,
    amountCents,
    comment,
    createdAt: Date.UTC(2026, month - 1, order),
  };
}
