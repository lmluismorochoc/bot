export const generateWildcardRegex = (pattern: string, wildcard = '%') => {
  const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regexPattern = escapedPattern.replace(
    new RegExp(wildcard.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),
    '.*',
  );
  return new RegExp(regexPattern, 'i');
};

export const nanoseconds = () => {
  const hrTime = process.hrtime();
  return hrTime[0] * 1e9 + hrTime[1];
};

export const isValidDate = (dateString: string) => {
  const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateFormatRegex.test(dateString)) {
    return false;
  }
  const parts = dateString.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const date = new Date(year, month, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month &&
    date.getDate() === day
  );
}

