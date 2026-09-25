export function fmt(value: number | null | undefined, digits = 1, unit = ""): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}${unit}`;
}

export function fmtSigned(value: number | null | undefined, digits = 0, unit = ""): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(digits)}${unit}`;
}

export function fmtPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  // Accept 0–1 fractions or 0–100 percentages.
  const pct = value <= 1 && value >= 0 ? value * 100 : value;
  return `${pct.toFixed(digits)}%`;
}

export function fmtSeconds(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)} s`;
}

export function fmtDateTime(value: string | number | undefined | null): string {
  if (value === null || value === undefined) return "—";
  const d =
    typeof value === "number" ? new Date(value < 1e12 ? value * 1000 : value) : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export function humanStatus(status: string | null | undefined): string {
  if (!status) return "—";
  return status.replace(/_/g, " ");
}
