const stripMarkdown = (text) =>
  (text || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[#>*_`-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const buildSummary = (article) => {
  if (article?.summary) {
    return article.summary;
  }
  const cleaned = stripMarkdown(article?.content || '');
  if (!cleaned) {
    return '';
  }
  return cleaned.length > 160 ? `${cleaned.slice(0, 160)}...` : cleaned;
};
