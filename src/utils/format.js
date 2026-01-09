export const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value);

export const formatDate = (value) =>
  new Date(value).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });

export const getInitials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
