/**
 * Display helpers for placement-intelligence fields.
 * NEVER fabricate values — these only format what already exists.
 */

export const EMPTY = "—";

export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value as object).length === 0;
  return false;
}

export function fmtText(value: string | null | undefined): string {
  return isEmpty(value) ? EMPTY : (value as string);
}

export function fmtNumber(
  value: number | null | undefined | string,
  opts?: Intl.NumberFormatOptions,
): string {
  if (value === null || value === undefined || value === "") return EMPTY;
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (typeof num !== "number" || Number.isNaN(num)) {
    return typeof value === "string" ? value : EMPTY;
  }
  return new Intl.NumberFormat("en-IN", opts).format(num);
}

export function fmtPercent(value: number | null | undefined | string, fractionDigits = 1): string {
  if (value === null || value === undefined || value === "") return EMPTY;
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (typeof num !== "number" || Number.isNaN(num)) {
    return typeof value === "string" ? value : EMPTY;
  }
  return `${num.toFixed(fractionDigits)}%`;
}

export function fmtRating(value: number | null | undefined | string): string {
  if (value === null || value === undefined || value === "") return EMPTY;
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (typeof num !== "number" || Number.isNaN(num)) {
    return typeof value === "string" ? value : EMPTY;
  }
  return num.toFixed(1);
}

export function fmtList(value: string[] | null | undefined, sep = " · "): string {
  if (!value || value.length === 0) return EMPTY;
  return value.join(sep);
}

export function fmtCompact(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return EMPTY;
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (typeof num !== "number" || Number.isNaN(num)) {
    return typeof value === "string" ? value : EMPTY;
  }
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(num);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
