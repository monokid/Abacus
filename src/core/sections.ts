export const SECTIONS = ["inkomsten", "vaste_kosten", "variabele_kosten"] as const;

export type Section = (typeof SECTIONS)[number];

export const SECTION_LABELS: Record<Section, string> = {
  inkomsten: "Inkomsten",
  vaste_kosten: "Vaste kosten",
  variabele_kosten: "Variabele kosten",
};

export function isSection(value: unknown): value is Section {
  return typeof value === "string" && (SECTIONS as readonly string[]).includes(value);
}
