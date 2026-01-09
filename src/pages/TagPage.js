import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listArticlesByTag } from '../api/tags';
import ArticleList from '../components/ArticleList';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { SORT_OPTIONS } from '../constants/listDefaults';
import { useListParams } from '../hooks/useListParams';
import { getErrorMessage } from '../utils/requests';

const TagPage = () => {
  const { name } = useParams();
  const { page, size, sort, setPage, setSort } = useListParams();
  const sortValue = SORT_OPTIONS.find((option) => option.value === sort)?.apiValue;

  const articlesQuery = useQuery({
    queryKey: ['tags', name, page, sort],
    queryFn: () => listArticlesByTag(name, { page, size, sort: sortValue }),
    enabled: Boolean(name),
  });

  return (
    <section className="home">
      <div className="feed">
        <div className="feed__header">
          <div>
            <span className="section-title">태그</span>
            <h2>{name}</h2>
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
        {articlesQuery.isLoading ? (
          <div className="card">태그 글을 불러오는 중...</div>
        ) : articlesQuery.isError ? (
          <EmptyState title="태그 글을 불러올 수 없어요" message={getErrorMessage(articlesQuery.error)} />
        ) : (
          <ArticleList
            items={articlesQuery.data?.items || []}
            emptyTitle="태그된 글이 없어요"
            emptyMessage="이 태그의 첫 글을 작성해보세요."
          />
        )}
        <Pagination
          page={page}
          totalPages={articlesQuery.data?.totalPages ?? 0}
          onPageChange={setPage}
        />
      </div>
    </section>
  );
};

export default TagPage;
