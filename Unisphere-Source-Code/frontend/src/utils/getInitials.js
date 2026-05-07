export const getInitials = (value, fallback = '?') => {
  if (typeof value !== 'string') return fallback;

  const trimmed = value.trim();
  if (!trimmed) return fallback;

  return trimmed.charAt(0).toUpperCase();
};
