const moneyFormatter = new Intl.NumberFormat("nl-BE", {
  style: "currency",
  currency: "EUR",
});

const decimalFormatter = new Intl.NumberFormat("nl-BE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function parseMoneyToCents(input: unknown): number {
  const normalized = normalizeMoneyInput(input);
  if (!normalized) return 0;

  const sign = normalized.startsWith("-") ? -1 : 1;
  const unsigned = normalized.replace(/^[+-]/, "");
  const [eurosPart = "0", centsPart = ""] = unsigned.split(".");

  if (!/^\d+$/.test(eurosPart) || (centsPart && !/^\d+$/.test(centsPart))) return 0;

  const euros = Number(eurosPart);
  if (!Number.isSafeInteger(euros)) return 0;

  const cents = Math.round(Number(`0.${centsPart || "0"}`) * 100);
  return sign * (euros * 100 + cents);
}

export function formatMoneyCents(valueCents: number): string {
  return moneyFormatter.format(valueCents / 100);
}

export function formatDecimalCents(valueCents: number | null): string {
  return valueCents === null ? "" : decimalFormatter.format(valueCents / 100);
}

function normalizeMoneyInput(input: unknown): string {
  let text = String(input ?? "").replace(/[\u20ac\s]/g, "");
  if (!text) return "";

  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    text = lastComma > lastDot ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
  } else if (lastComma >= 0) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (lastDot >= 0) {
    const parts = text.split(".");
    const lastPart = parts.at(-1) ?? "";
    if (parts.length > 1 && lastPart.length === 3) {
      text = text.replace(/\./g, "");
    }
  }

  return text;
}
