import { useQuery } from '@tanstack/react-query';
import ArticleList from '../components/ArticleList';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { searchArticles } from '../api/search';
import { SORT_OPTIONS } from '../constants/listDefaults';
import { useListParams } from '../hooks/useListParams';
import { getErrorMessage } from '../utils/requests';

const SearchPage = () => {
  const { page, size, sort, query, setPage, setSort } = useListParams({ includeQuery: true });
  const sortValue = SORT_OPTIONS.find((option) => option.value === sort)?.apiValue;

  const searchQuery = useQuery({
    queryKey: ['search', query, page, sort],
    queryFn: () => searchArticles({ query, page, size, sort: sortValue }),
    enabled: Boolean(query),
  });

  if (!query) {
    return (
      <EmptyState
        title="개발 로그 검색"
        message="검색창에 키워드를 입력하면 글을 찾을 수 있어요."
      />
    );
  }

  return (
    <section className="home">
      <div className="feed">
        <div className="feed__header">
          <div>
            <span className="section-title">검색</span>
            <h2>{query}</h2>
          </div>
          <div className="tabs">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`tab ${sort === option.value ? 'tab--active' : ''}`}
                onClick={() => setSort(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {searchQuery.isLoading ? (
          <div className="card">검색 중...</div>
        ) : searchQuery.isError ? (
          <EmptyState title="검색에 실패했어요" message={getErrorMessage(searchQuery.error)} />
        ) : (
          <ArticleList
            items={searchQuery.data?.items || []}
            emptyTitle="검색 결과가 없어요"
            emptyMessage="다른 키워드로 검색해보세요."
          />
        )}
        <Pagination
          page={page}
          totalPages={searchQuery.data?.totalPages ?? 0}
          onPageChange={setPage}
        />
      </div>
    </section>
  );
};

export default SearchPage;
