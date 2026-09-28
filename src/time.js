const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

export function formatRelativeActivity(dateString) {
  if (!dateString) {
    return 'Active —';
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return 'Active —';
  }

  const diffMs = Math.max(0, Date.now() - date.getTime());

  if (diffMs < HOUR_MS) {
    return `Active ${Math.max(1, Math.floor(diffMs / MINUTE_MS))}m ago`;
  }
  if (diffMs < DAY_MS) {
    return `Active ${Math.floor(diffMs / HOUR_MS)}h ago`;
  }
  if (diffMs < MONTH_MS) {
    return `Active ${Math.floor(diffMs / DAY_MS)}d ago`;
  }
  if (diffMs < YEAR_MS) {
    return `Active ${Math.floor(diffMs / MONTH_MS)}mo ago`;
  }
  return `Active ${Math.floor(diffMs / YEAR_MS)}y ago`;
}

export function formatAccountAge(createdAtString) {
  if (!createdAtString) {
    return '—';
  }

  const date = new Date(createdAtString);
  if (isNaN(date.getTime())) {
    return '—';
  }

  const diffMs = Math.max(0, Date.now() - date.getTime());
  const years = Math.floor(diffMs / YEAR_MS);

  if (years < 1) {
    const months = Math.max(1, Math.floor(diffMs / MONTH_MS));
    return months === 1 ? '1 Month on GitHub' : `${months} Months on GitHub`;
  }

  return years === 1 ? '1 Year on GitHub' : `${years} Years on GitHub`;
}
