// Chilean formatting utilities (legacy helpers without currency context)

export function formatPeso(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatUF(value: number): string {
  return value.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + ' UF';
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) {
    return 'Sin fecha';
  }
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatPercent(value: number): string {
  return value.toFixed(1) + '%';
}

export function formatNumber(value: number): string {
  return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
