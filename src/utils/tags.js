export const parseTagsInput = (value) =>
  (value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
