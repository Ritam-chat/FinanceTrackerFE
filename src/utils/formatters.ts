// Format amount with commas and ₹ symbol
export const formatAmount = (amountStr: string): string => {
  const amount = parseFloat(amountStr) || 0;
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Date label logic: if is today, return "Today", if yesterday "Yesterday", else DD MMM YYYY
export const getDateLabel = (dateStr: string): string => {
  // dateStr is from the timestamp key, usually format "2026-04-14T20:30:00" assuming standard ISO
  // let's parse from time string if it's "14-Apr, 08:30 PM". But backend provides a complex format, we will use the timestamp key from nest which is ISO or string.
  // We'll normalize it in `flatten.ts`. Assuming dateStr is 'YYYY-MM-DD'
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';

  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  return date.toLocaleDateString('en-GB', options);
};
