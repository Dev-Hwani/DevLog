import { useInfiniteQuery } from '@tanstack/react-query';
import ArticleList from '../components/ArticleList';
import EmptyState from '../components/EmptyState';
import { fetchTrendingFeed } from '../api/feed';
import { useCursorParams } from '../hooks/useCursorParams';
import { getErrorMessage } from '../utils/requests';

const TrendingPage = () => {
  const { cursor, size, setCursor } = useCursorParams();
  const feedQuery = useInfiniteQuery({
    queryKey: ['feed', 'trending'],
    queryFn: ({ pageParam }) => fetchTrendingFeed({ cursor: pageParam, size }),
    initialPageParam: cursor,
    getNextPageParam: (lastPage) => lastPage?.nextCursor || undefined,
  });

  const items = feedQuery.data?.pages.flatMap((page) => page.items) || [];
  const handleLoadMore = async () => {
    const result = await feedQuery.fetchNextPage();
    const nextCursor = result.data?.pages?.slice(-1)[0]?.nextCursor;
    if (nextCursor) {
      setCursor(nextCursor);
    }
  };

  return (
    <section className="home">
      <div className="feed">
        <div className="feed__header">
          <div className="tabs">
            <button type="button" className="tab tab--active">
              트렌딩 24h
            </button>
          </div>
        </div>
        {feedQuery.isLoading ? (
          <div className="card">트렌딩을 불러오는 중...</div>
        ) : feedQuery.isError ? (
          <EmptyState title="트렌딩을 불러올 수 없어요" message={getErrorMessage(feedQuery.error)} />
        ) : (
          <ArticleList
            items={items}
            emptyTitle="트렌딩 글이 없어요"
            emptyMessage="조금만 기다리면 새로운 글이 올라올 거예요."
          />
        )}
        {feedQuery.hasNextPage && (
          <button
            type="button"
            className="button button--solid button--wide"
            onClick={handleLoadMore}
            disabled={feedQuery.isFetchingNextPage}
          >
            {feedQuery.isFetchingNextPage ? '불러오는 중...' : '더 불러오기'}
          </button>
        )}
      </div>
    </section>
  );
};

export default TrendingPage;
