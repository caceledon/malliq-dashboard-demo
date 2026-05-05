// UF rates and contract "fecha de referencia" are anchored to the Chilean
// calendar day. Date.toISOString() reports UTC, which rolls forward during
// the ~21:00–24:00 Chile window — pull the day via Intl with America/Santiago
// instead.

const CL_DAY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santiago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function chileIsoDay(date: Date = new Date()): string {
  if (Number.isNaN(date.getTime())) return '';
  return CL_DAY_FORMATTER.format(date);
}
