import type { Book, Entry } from "./model";
import { createEmptyBook } from "./model";

export function fictionalSampleBook(): Book {
  const book = createEmptyBook(2026);
  const year = book.years[0];
  if (!year) return book;

  year.startBalanceCents = 221_881;
  const january = year.months[0];
  const february = year.months[1];
  if (!january || !february) return book;

  january.entries = [
    entry("jan-income-pension", "inkomsten", "sub-ink-pensioen", "2026-01-01", "Pensioendienst", "Pensioen", 233_259, 1),
    entry("jan-income-family", "inkomsten", "sub-ink-familie", "2026-01-01", "Familie", "Bijdrage familie", 4_894, 2),
    entry("jan-rent", "vaste_kosten", "sub-vast-wonen", "2026-01-03", "Woonfonds", "Huur", 82_000, 3),
    entry("jan-energy", "vaste_kosten", "sub-vast-energie", "2026-01-05", "Luminus", "Voorschot energie", 15_431, 4),
    entry("jan-health", "variabele_kosten", "sub-var-gezondheid", "2026-01-12", "Apotheek", "Medicatie", 3_780, 5),
    entry("jan-household", "variabele_kosten", "sub-var-huishouden", "2026-01-15", "Delhaize", "Huishouden", 24_050, 6),
  ];

  february.entries = [
    entry("feb-income-pension", "inkomsten", "sub-ink-pensioen", "2026-02-01", "Pensioendienst", "Pensioen", 233_259, 7),
    entry("feb-telecom", "vaste_kosten", "sub-vast-telecom", "2026-02-04", "Telenet", "Internet en telefoon", 7_643, 8),
    entry("feb-gift", "variabele_kosten", "sub-var-cadeaus", "2026-02-18", "Familie", "Verjaardag", 5_000, 9),
    entry("feb-empty-plan", "variabele_kosten", "sub-var-auto", "2026-02-20", "Garage", "Nog te plannen", null, 10),
  ];

  book.labels = {
    parties: ["Pensioendienst", "Familie", "Luminus", "Telenet", "Apotheek", "Delhaize", "Garage"],
    income: ["Pensioen", "Bijdrage familie"],
    expense: ["Huur", "Voorschot energie", "Medicatie", "Huishouden", "Internet en telefoon", "Verjaardag"],
  };

  return book;
}

function entry(
  id: string,
  section: Entry["section"],
  subcategoryId: string | null,
  date: string,
  party: string,
  description: string,
  amountCents: number | null,
  order: number,
): Entry {
  return {
    id,
    section,
    subcategoryId,
    date,
    party,
    description,
    amountCents,
    comment: "",
    createdAt: Date.UTC(2026, 0, order),
  };
}
