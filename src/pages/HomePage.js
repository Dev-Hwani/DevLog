import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listArticles } from '../api/articles';
import { listTags } from '../api/tags';
import ArticleCard from '../components/ArticleCard';
import ArticleList from '../components/ArticleList';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { SORT_OPTIONS } from '../constants/listDefaults';
import { useListParams } from '../hooks/useListParams';
import { ROUTE_PATHS, buildPath } from '../routes/paths';
import { formatDate, formatNumber } from '../utils/format';
import { getErrorMessage } from '../utils/requests';

const HomePage = () => {
  const { page, size, sort, setPage, setSort } = useListParams();
  const sortValue = SORT_OPTIONS.find((option) => option.value === sort)?.apiValue;

  const articlesQuery = useQuery({
    queryKey: ['articles', { page, sort }],
    queryFn: () => listArticles({ page, size, sort: sortValue }),
  });

  const tagsQuery = useQuery({
    queryKey: ['tags'],
    queryFn: listTags,
  });

  const items = articlesQuery.data?.items || [];
  const featured = items.slice(0, 2);
  const rest = items.slice(2);
  const totalArticles = articlesQuery.data?.totalElements ?? 0;
  const totalTags = tagsQuery.data?.length ?? 0;

  return (
    <section className="home">
      <div className="hero">
        <div>
          <span className="eyebrow">Velog clone</span>
          <h1>개발 로그를 쌓고, 나만의 포트폴리오로 연결하세요.</h1>
          <p>
            Velog 스타일의 공간에서 배움을 기록하세요. Markdown으로 작성하고, 동료와 공유하며
            개발자 네트워크를 키워보세요.
          </p>
          <div className="hero__actions">
            <Link to={ROUTE_PATHS.trending} className="button button--solid">
              둘러보기
            </Link>
            <Link to={ROUTE_PATHS.editor} className="button button--ghost">
              글쓰기 시작
            </Link>
          </div>
        </div>
        <div className="hero__stats">
          <div className="stat-card">
            <div className="stat-value">{formatNumber(totalArticles)}</div>
            <div className="stat-label">발행된 글</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatNumber(totalTags)}</div>
            <div className="stat-label">활성 태그</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">24h</div>
            <div className="stat-label">트렌딩 기준</div>
          </div>
        </div>
      </div>
      <div className="layout">
        <div className="feed">
          <div className="feed__header">
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
            <div className="card">피드를 불러오는 중...</div>
          ) : articlesQuery.isError ? (
            <EmptyState title="피드를 불러올 수 없어요" message={getErrorMessage(articlesQuery.error)} />
          ) : (
            <>
              {featured.length > 0 && (
                <div className="featured-grid">
                  {featured.map((article) => (
                    <ArticleCard key={article.id} article={article} variant="featured" />
                  ))}
                </div>
              )}
              <ArticleList
                items={rest}
                emptyTitle="아직 글이 없어요"
                emptyMessage="첫 번째 글을 올려보세요."
              />
            </>
          )}
          <Pagination
            page={page}
            totalPages={articlesQuery.data?.totalPages ?? 0}
            onPageChange={setPage}
          />
        </div>
        <aside className="sidebar">
          <div className="card">
            <div className="card__title">인기 태그</div>
            <div className="tag-grid">
              {(tagsQuery.data || []).slice(0, 12).map((tag) => (
                <Link key={tag.name} to={buildPath.tag(tag.name)} className="tag-pill">
                  {tag.name} ({formatNumber(tag.count)})
                </Link>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card__title">최근 하이라이트</div>
            <div className="card__list">
              {items.slice(0, 3).map((article) => (
                <div key={article.id} className="list-item">
                  <div className="list-title">{article.title}</div>
                  <div className="list-meta">
                    {article.author?.nickname || '익명'} -{' '}
                    {article.createdAt ? formatDate(article.createdAt) : '최근'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
      <div className="roadmaps">
        <div className="section-title">관심 분야</div>
        <div className="roadmap-grid">
          <div className="roadmap-card">
            <h3>프론트엔드 로그</h3>
            <p>React, UI 시스템, 컴포넌트 라이브러리 경험을 공유하세요.</p>
            <div className="roadmap-tags">
              <span className="roadmap-tag">React</span>
              <span className="roadmap-tag">Design</span>
              <span className="roadmap-tag">Testing</span>
            </div>
          </div>
          <div className="roadmap-card">
            <h3>백엔드 노트</h3>
            <p>서비스, 마이그레이션, 성능 최적화를 기록하세요.</p>
            <div className="roadmap-tags">
              <span className="roadmap-tag">Spring Boot</span>
              <span className="roadmap-tag">MySQL</span>
              <span className="roadmap-tag">Redis</span>
            </div>
          </div>
          <div className="roadmap-card">
            <h3>풀스택 스터디</h3>
            <p>아키텍처 패턴과 API 연동 팁을 공유하세요.</p>
            <div className="roadmap-tags">
              <span className="roadmap-tag">Architecture</span>
              <span className="roadmap-tag">Security</span>
              <span className="roadmap-tag">DevOps</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomePage;
