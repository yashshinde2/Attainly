const FORMULA_PREFIX_RE = /^[=+\-@\t\r]/

/**
 * Escapes a single CSV cell per RFC 4180 and neutralizes spreadsheet formula injection (CWE-1236).
 */
export function escapeCsvCell(value: string | number | boolean | undefined | null): string {
  const raw = value === undefined || value === null ? '' : String(value)
  const neutralized = FORMULA_PREFIX_RE.test(raw) ? `'${raw}` : raw
  if (/[",\n\r]/.test(neutralized)) {
    return `"${neutralized.replace(/"/g, '""')}"`
  }
  return neutralized
}
