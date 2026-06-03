const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function formatMoney(value, fallback = '$0.00') {
  const numeric = safeNumber(value, NaN);
  return Number.isFinite(numeric) ? currencyFormatter.format(numeric) : fallback;
}

export function formatPercent(value, digits = 2) {
  const numeric = safeNumber(value, NaN);
  if (!Number.isFinite(numeric)) {
    return '0.00%';
  }

  return `${numeric.toFixed(digits)}%`;
}