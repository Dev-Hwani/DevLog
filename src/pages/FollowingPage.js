import { Link } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchFollowingFeed } from '../api/feed';
import ArticleList from '../components/ArticleList';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { ROUTE_PATHS } from '../routes/paths';
import { useCursorParams } from '../hooks/useCursorParams';
import { getErrorMessage } from '../utils/requests';

const FollowingPage = () => {
  const { user } = useAuth();
  const { cursor, size, setCursor } = useCursorParams();
  const feedQuery = useInfiniteQuery({
    queryKey: ['feed', 'following'],
    queryFn: ({ pageParam }) => fetchFollowingFeed({ cursor: pageParam, size }),
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

  if (!user) {
    return (
      <EmptyState
        title="로그인하면 팔로잉 피드를 볼 수 있어요"
        message="관심 있는 작성자를 팔로우해보세요."
        action={
          <Link to={ROUTE_PATHS.login} className="button button--solid">
            로그인
          </Link>
        }
      />
    );
  }

  return (
    <section className="home">
      <div className="feed">
        <div className="feed__header">
          <div className="tabs">
            <button type="button" className="tab tab--active">
              팔로잉
            </button>
          </div>
        </div>
        {feedQuery.isLoading ? (
          <div className="card">팔로잉 피드를 불러오는 중...</div>
        ) : feedQuery.isError ? (
          <EmptyState title="피드를 불러올 수 없어요" message={getErrorMessage(feedQuery.error)} />
        ) : (
          <ArticleList
            items={items}
            emptyTitle="팔로잉 글이 없어요"
            emptyMessage="팔로우하면 피드가 채워져요."
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

export default FollowingPage;
