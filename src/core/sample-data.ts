import type { Book, Entry } from "./model";
import { createEmptyBook } from "./model";

export function fictionalSampleBook(): Book {
  const book = createEmptyBook(2026);
  const year = book.years[0];
  if (!year) return book;

  year.startBalance = 2218.81;
  const january = year.months[0];
  const february = year.months[1];
  if (!january || !february) return book;

  january.entries = [
    entry("jan-income-pension", "inkomsten", "sub-ink-pensioen", "2026-01-01", "", "Pensioen", 2332.59, 1),
    entry("jan-income-family", "inkomsten", "sub-ink-familie", "2026-01-01", "", "Bijdrage familie", 48.94, 2),
    entry("jan-rent", "vaste_kosten", "sub-vast-wonen", "2026-01-03", "Woonfonds", "Huur", 820, 3),
    entry("jan-energy", "vaste_kosten", "sub-vast-energie", "2026-01-05", "Luminus", "Voorschot energie", 154.31, 4),
    entry("jan-health", "variabele_kosten", "sub-var-gezondheid", "2026-01-12", "Apotheek", "Medicatie", 37.8, 5),
    entry("jan-household", "variabele_kosten", "sub-var-huishouden", "2026-01-15", "Delhaize", "Huishouden", 240.5, 6),
  ];

  february.entries = [
    entry("feb-income-pension", "inkomsten", "sub-ink-pensioen", "2026-02-01", "", "Pensioen", 2332.59, 7),
    entry("feb-telecom", "vaste_kosten", "sub-vast-telecom", "2026-02-04", "Telenet", "Internet en telefoon", 76.43, 8),
    entry("feb-gift", "variabele_kosten", "sub-var-cadeaus", "2026-02-18", "Familie", "Verjaardag", 50, 9),
    entry("feb-empty-plan", "variabele_kosten", "sub-var-auto", "2026-02-20", "Garage", "Nog te plannen", null, 10),
  ];

  book.labels = {
    parties: ["Luminus", "Telenet", "Apotheek", "Delhaize", "Garage"],
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
  amount: number | null,
  order: number,
): Entry {
  return {
    id,
    section,
    subcategoryId,
    date,
    party,
    description,
    amount,
    comment: "",
    createdAt: Date.UTC(2026, 0, order),
  };
}
