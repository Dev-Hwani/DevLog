const Pagination = ({ page, totalPages, onPageChange }) => {
  if (!totalPages || totalPages <= 1) {
    return null;
  }

  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  return (
    <div className="post-actions">
      <button
        type="button"
        className="button button--ghost"
        onClick={() => onPageChange(page - 1)}
        disabled={isFirst}
      >
        이전
      </button>
      <span className="filter-label">
        {page} / {totalPages} 페이지
      </span>
      <button
        type="button"
        className="button button--ghost"
        onClick={() => onPageChange(page + 1)}
        disabled={isLast}
      >
        다음
      </button>
    </div>
  );
};

export default Pagination;
