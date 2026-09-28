export function calculateLongestStreak(calendar) {
  if (!calendar || !calendar.weeks) {
    return 0;
  }

  const days = calendar.weeks
    .flatMap(week => week.contributionDays)
    .filter(day => day && day.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  let longest = 0;
  let current = 0;

  for (const day of days) {
    if (day.contributionCount > 0) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }

  return longest;
}

export function formatStreak(streakCount) {
  if (streakCount === 1) {
    return '1 Day';
  }
  return `${streakCount} Days`;
}
