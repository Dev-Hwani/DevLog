import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  NavLink,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
  useLocation,
} from 'react-router-dom';
import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import './App.css';
import { API_BASE_URL } from './api/config';
import { fetchMe, login as loginRequest, signup as signupRequest, logout as logoutRequest } from './api/auth';
import { subscribeEvents } from './api/eventBus';
import {
  listArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
  updateVisibility,
  uploadThumbnail,
} from './api/articles';
import { listComments, createComment, deleteComment, updateComment } from './api/comments';
import { likeArticle, unlikeArticle, bookmarkArticle, unbookmarkArticle } from './api/reactions';
import { followUser, unfollowUser } from './api/follows';
import { listTags, listArticlesByTag } from './api/tags';
import { fetchFollowingFeed, fetchTrendingFeed } from './api/feed';
import { searchArticles } from './api/search';
import { getUserProfile, updateMeProfile, updateProfileImage, listUserArticles } from './api/users';
import MarkdownPreview from './components/MarkdownPreview';
import { formatDate, formatNumber, getInitials } from './utils/format';

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest', apiValue: undefined },
  { value: 'views', label: 'Views', apiValue: 'views' },
  { value: 'likes', label: 'Likes', apiValue: 'likes' },
];
const PAGE_SIZE = 10;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png'];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

const buildImageUrl = (value) => {
  if (!value) {
    return null;
  }
  if (value.startsWith('http')) {
    return value;
  }
  return `${API_BASE_URL}${value}`;
};

const parseNumberParam = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
};

const parseSortParam = (value) => {
  const matched = SORT_OPTIONS.find((option) => option.value === value);
  return matched ? matched.value : 'latest';
};

const buildSearchParams = (current, updates) => {
  const next = new URLSearchParams(current);
  Object.entries(updates).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }
  });
  return next;
};

const buildCoverStyle = (url) => ({
  backgroundImage: url
    ? `url(${url})`
    : 'linear-gradient(135deg, rgba(18, 184, 134, 0.35), rgba(34, 139, 230, 0.35))',
});

const stripMarkdown = (text) =>
  (text || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[#>*_`-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const buildSummary = (article) => {
  if (article?.summary) {
    return article.summary;
  }
  const cleaned = stripMarkdown(article?.content || '');
  if (!cleaned) {
    return '';
  }
  return cleaned.length > 160 ? `${cleaned.slice(0, 160)}...` : cleaned;
};

const parseTagsInput = (value) =>
  (value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

const getErrorMessage = (error) => {
  if (!error) {
    return '';
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'Request failed.';
};

const validateImageFile = (file) => {
  if (!file) {
    return 'No file selected.';
  }
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Only JPG and PNG files are allowed.';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'Image must be 10MB or smaller.';
  }
  return '';
};

const AuthContext = React.createContext(null);

const AuthProvider = ({ children }) => {
  const queryCache = useQueryClient();
  const meQuery = useQuery({ queryKey: ['me'], queryFn: fetchMe });

  const loginMutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (data) => {
      queryCache.setQueryData(['me'], data);
    },
  });

  const signupMutation = useMutation({
    mutationFn: signupRequest,
    onSuccess: (data) => {
      queryCache.setQueryData(['me'], data);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      queryCache.setQueryData(['me'], null);
    },
  });

  const value = useMemo(
    () => ({
      user: meQuery.data || null,
      isLoading: meQuery.isLoading,
      login: loginMutation.mutateAsync,
      signup: signupMutation.mutateAsync,
      logout: logoutMutation.mutateAsync,
    }),
    [
      meQuery.data,
      meQuery.isLoading,
      loginMutation.mutateAsync,
      signupMutation.mutateAsync,
      logoutMutation.mutateAsync,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('AuthProvider is missing');
  }
  return ctx;
};

const RequireAuth = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="card">Loading...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
};

const EmptyState = ({ title, message, action }) => (
  <div className="empty-state">
    <h3>{title}</h3>
    <p className="empty-muted">{message}</p>
    {action}
  </div>
);

const GlobalNotice = ({ notice, onClose }) => {
  if (!notice) {
    return null;
  }

  return (
    <div className={`notice notice--${notice.type}`}>
      <div className="notice__inner">
        <span className="notice__message">{notice.message}</span>
        <button type="button" className="notice__close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

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
        Prev
      </button>
      <span className="filter-label">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        className="button button--ghost"
        onClick={() => onPageChange(page + 1)}
        disabled={isLast}
      >
        Next
      </button>
    </div>
  );
};

const ArticleCard = ({ article, variant = 'default' }) => {
  const navigate = useNavigate();
  const thumbnail = buildImageUrl(article?.thumbnailUrl);
  const tags = article?.tags || [];

  const handleOpen = () => {
    if (article?.id) {
      navigate(`/article/${article.id}`);
    }
  };

  return (
    <article className={`post-card ${variant === 'featured' ? 'featured' : ''}`}>
      <button
        type="button"
        className="post-cover"
        style={buildCoverStyle(thumbnail)}
        onClick={handleOpen}
        aria-label="Open article"
      />
      <div className="post-body">
        <div className="post-meta">
          <span>{article?.author?.nickname || 'Anonymous'}</span>
          <span>{article?.createdAt ? formatDate(article.createdAt) : 'Unknown date'}</span>
        </div>
        <button type="button" className="post-title" onClick={handleOpen}>
          {article?.title || 'Untitled'}
        </button>
        {buildSummary(article) && <p className="article-summary">{buildSummary(article)}</p>}
        {tags.length > 0 && (
          <div className="post-tags">
            {tags.map((tag) => (
              <Link key={tag} to={`/tag/${encodeURIComponent(tag)}`} className="tag-pill">
                {tag}
              </Link>
            ))}
          </div>
        )}
        <div className="post-footer">
          <span>{formatNumber(article?.viewCount ?? 0)} views</span>
          <span>{formatNumber(article?.likeCount ?? 0)} likes</span>
        </div>
      </div>
    </article>
  );
};

const ArticleList = ({ items, emptyTitle, emptyMessage }) => {
  if (!items || items.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <div className="post-grid">
      {items.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
};

const Topbar = ({ theme, onToggleTheme }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    if (location.pathname !== '/search') {
      return;
    }
    const params = new URLSearchParams(location.search);
    setSearchValue(params.get('query') || '');
  }, [location.pathname, location.search]);

  const handleSearch = (event) => {
    event.preventDefault();
    const query = searchValue.trim();
    if (query) {
      navigate(`/search?query=${encodeURIComponent(query)}`);
    }
  };

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <Link to="/" className="brand">
          <span className="brand__logo">velog</span>
          <span className="brand__tagline">devlog network</span>
        </Link>
        <nav className="nav">
          <NavLink className="nav__link" to="/">
            Home
          </NavLink>
          <NavLink className="nav__link" to="/trending">
            Trending
          </NavLink>
          <NavLink className="nav__link" to="/following">
            Following
          </NavLink>
          <NavLink className="nav__link" to="/editor">
            Write
          </NavLink>
        </nav>
        <div className="topbar__actions">
          <form className="search" onSubmit={handleSearch}>
            <span className="search__icon">S</span>
            <input
              className="search__input"
              placeholder="Search articles"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </form>
          <button type="button" className="button button--ghost theme-toggle" onClick={onToggleTheme}>
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          {user ? (
            <>
              <Link to={`/profile/${user.id}`} className="button button--ghost">
                Profile
              </Link>
              <button type="button" className="button button--ghost" onClick={() => logout()}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="button button--ghost">
                Login
              </Link>
              <Link to="/signup" className="button button--solid">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

const Footer = () => (
  <footer className="footer">
    <span>Velog clone for developers. Built for longform technical writing.</span>
    <div className="footer__links">
      <a href="/">Docs</a>
      <a href="/trending">Trending</a>
      <a href="/following">Following</a>
    </div>
  </footer>
);

const HomePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseNumberParam(searchParams.get('page'), 1));
  const sort = parseSortParam(searchParams.get('sort'));
  const sortValue = SORT_OPTIONS.find((option) => option.value === sort)?.apiValue;
  const setPage = (nextPage) => {
    setSearchParams(buildSearchParams(searchParams, { page: nextPage, sort, size: PAGE_SIZE }));
  };
  const setSort = (nextSort) => {
    setSearchParams(buildSearchParams(searchParams, { sort: nextSort, page: 1, size: PAGE_SIZE }));
  };

  const articlesQuery = useQuery({
    queryKey: ['articles', { page, sort }],
    queryFn: () => listArticles({ page: page - 1, size: PAGE_SIZE, sort: sortValue }),
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
          <h1>Curate your developer log, build your public portfolio.</h1>
          <p>
            Capture what you are learning in a velog-style workspace. Write in Markdown, share with
            peers, and grow a developer-focused network.
          </p>
          <div className="hero__actions">
            <Link to="/trending" className="button button--solid">
              Explore
            </Link>
            <Link to="/editor" className="button button--ghost">
              Start writing
            </Link>
          </div>
        </div>
        <div className="hero__stats">
          <div className="stat-card">
            <div className="stat-value">{formatNumber(totalArticles)}</div>
            <div className="stat-label">Published articles</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatNumber(totalTags)}</div>
            <div className="stat-label">Active tags</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">24h</div>
            <div className="stat-label">Trending window</div>
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
            <div className="card">Loading feed...</div>
          ) : articlesQuery.isError ? (
            <EmptyState title="Feed unavailable" message={getErrorMessage(articlesQuery.error)} />
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
                emptyTitle="No articles yet"
                emptyMessage="Be the first to publish a post in the devlog feed."
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
            <div className="card__title">Top tags</div>
            <div className="tag-grid">
              {(tagsQuery.data || []).slice(0, 12).map((tag) => (
                <Link key={tag.name} to={`/tag/${encodeURIComponent(tag.name)}`} className="tag-pill">
                  {tag.name} ({formatNumber(tag.count)})
                </Link>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card__title">Latest highlights</div>
            <div className="card__list">
              {items.slice(0, 3).map((article) => (
                <div key={article.id} className="list-item">
                  <div className="list-title">{article.title}</div>
                  <div className="list-meta">
                    {article.author?.nickname || 'Anonymous'} -{' '}
                    {article.createdAt ? formatDate(article.createdAt) : 'Recently'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
      <div className="roadmaps">
        <div className="section-title">Focus lanes</div>
        <div className="roadmap-grid">
          <div className="roadmap-card">
            <h3>Frontend logbooks</h3>
            <p>Share experiments with React, UI systems, and component libraries.</p>
            <div className="roadmap-tags">
              <span className="roadmap-tag">React</span>
              <span className="roadmap-tag">Design</span>
              <span className="roadmap-tag">Testing</span>
            </div>
          </div>
          <div className="roadmap-card">
            <h3>Backend field notes</h3>
            <p>Document services, migrations, and performance findings.</p>
            <div className="roadmap-tags">
              <span className="roadmap-tag">Spring Boot</span>
              <span className="roadmap-tag">MySQL</span>
              <span className="roadmap-tag">Redis</span>
            </div>
          </div>
          <div className="roadmap-card">
            <h3>Fullstack studies</h3>
            <p>Build cross-layer patterns and share API integration tips.</p>
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

const TrendingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const cursor = searchParams.get('cursor') || undefined;
  const feedQuery = useInfiniteQuery({
    queryKey: ['feed', 'trending'],
    queryFn: ({ pageParam }) => fetchTrendingFeed({ cursor: pageParam, size: PAGE_SIZE }),
    initialPageParam: cursor,
    getNextPageParam: (lastPage) => lastPage?.nextCursor || undefined,
  });

  const items = feedQuery.data?.pages.flatMap((page) => page.items) || [];
  const handleLoadMore = async () => {
    const result = await feedQuery.fetchNextPage();
    const nextCursor = result.data?.pages?.slice(-1)[0]?.nextCursor;
    if (nextCursor) {
      setSearchParams(buildSearchParams(searchParams, { cursor: nextCursor, size: PAGE_SIZE }));
    }
  };

  return (
    <section className="home">
      <div className="feed">
        <div className="feed__header">
          <div className="tabs">
            <button type="button" className="tab tab--active">
              Trending 24h
            </button>
          </div>
        </div>
        {feedQuery.isLoading ? (
          <div className="card">Loading trending feed...</div>
        ) : feedQuery.isError ? (
          <EmptyState title="Trending feed unavailable" message={getErrorMessage(feedQuery.error)} />
        ) : (
          <ArticleList
            items={items}
            emptyTitle="No trending posts"
            emptyMessage="Stay tuned for the next wave of trending articles."
          />
        )}
        {feedQuery.hasNextPage && (
          <button
            type="button"
            className="button button--solid button--wide"
            onClick={handleLoadMore}
            disabled={feedQuery.isFetchingNextPage}
          >
            {feedQuery.isFetchingNextPage ? 'Loading...' : 'Load more'}
          </button>
        )}
      </div>
    </section>
  );
};

const FollowingPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const cursor = searchParams.get('cursor') || undefined;
  const feedQuery = useInfiniteQuery({
    queryKey: ['feed', 'following'],
    queryFn: ({ pageParam }) => fetchFollowingFeed({ cursor: pageParam, size: PAGE_SIZE }),
    initialPageParam: cursor,
    getNextPageParam: (lastPage) => lastPage?.nextCursor || undefined,
  });

  const items = feedQuery.data?.pages.flatMap((page) => page.items) || [];
  const handleLoadMore = async () => {
    const result = await feedQuery.fetchNextPage();
    const nextCursor = result.data?.pages?.slice(-1)[0]?.nextCursor;
    if (nextCursor) {
      setSearchParams(buildSearchParams(searchParams, { cursor: nextCursor, size: PAGE_SIZE }));
    }
  };

  if (!user) {
    return (
      <EmptyState
        title="Sign in to see your feed"
        message="Follow authors to build a personalized feed."
        action={
          <Link to="/login" className="button button--solid">
            Login
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
              Following
            </button>
          </div>
        </div>
        {feedQuery.isLoading ? (
          <div className="card">Loading following feed...</div>
        ) : feedQuery.isError ? (
          <EmptyState title="Feed unavailable" message={getErrorMessage(feedQuery.error)} />
        ) : (
          <ArticleList
            items={items}
            emptyTitle="No following posts"
            emptyMessage="Follow authors and the feed will appear here."
          />
        )}
        {feedQuery.hasNextPage && (
          <button
            type="button"
            className="button button--solid button--wide"
            onClick={handleLoadMore}
            disabled={feedQuery.isFetchingNextPage}
          >
            {feedQuery.isFetchingNextPage ? 'Loading...' : 'Load more'}
          </button>
        )}
      </div>
    </section>
  );
};

const TagPage = () => {
  const { name } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseNumberParam(searchParams.get('page'), 1));
  const sort = parseSortParam(searchParams.get('sort'));
  const sortValue = SORT_OPTIONS.find((option) => option.value === sort)?.apiValue;
  const setPage = (nextPage) => {
    setSearchParams(buildSearchParams(searchParams, { page: nextPage, sort, size: PAGE_SIZE }));
  };
  const setSort = (nextSort) => {
    setSearchParams(buildSearchParams(searchParams, { sort: nextSort, page: 1, size: PAGE_SIZE }));
  };

  const articlesQuery = useQuery({
    queryKey: ['tags', name, page, sort],
    queryFn: () => listArticlesByTag(name, { page: page - 1, size: PAGE_SIZE, sort: sortValue }),
    enabled: Boolean(name),
  });

  return (
    <section className="home">
      <div className="feed">
        <div className="feed__header">
          <div>
            <span className="section-title">Tag</span>
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
          <div className="card">Loading tag posts...</div>
        ) : articlesQuery.isError ? (
          <EmptyState title="Tag feed unavailable" message={getErrorMessage(articlesQuery.error)} />
        ) : (
          <ArticleList
            items={articlesQuery.data?.items || []}
            emptyTitle="No tagged posts"
            emptyMessage="Write the first article for this tag."
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

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('query') || '';
  const page = Math.max(1, parseNumberParam(searchParams.get('page'), 1));
  const sort = parseSortParam(searchParams.get('sort'));
  const sortValue = SORT_OPTIONS.find((option) => option.value === sort)?.apiValue;
  const setPage = (nextPage) => {
    setSearchParams(
      buildSearchParams(searchParams, { query, page: nextPage, sort, size: PAGE_SIZE })
    );
  };
  const setSort = (nextSort) => {
    setSearchParams(
      buildSearchParams(searchParams, { query, sort: nextSort, page: 1, size: PAGE_SIZE })
    );
  };

  useEffect(() => {
    if (query && page > 1) {
      setSearchParams(
        buildSearchParams(searchParams, { query, sort, page: 1, size: PAGE_SIZE }),
        { replace: true }
      );
    }
  }, [query, page, searchParams, setSearchParams, sort]);

  const searchQuery = useQuery({
    queryKey: ['search', query, page, sort],
    queryFn: () => searchArticles({ query, page: page - 1, size: PAGE_SIZE, sort: sortValue }),
    enabled: Boolean(query),
  });

  if (!query) {
    return (
      <EmptyState
        title="Search the devlog"
        message="Type a keyword in the search bar to explore articles."
      />
    );
  }

  return (
    <section className="home">
      <div className="feed">
        <div className="feed__header">
          <div>
            <span className="section-title">Search</span>
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
          <div className="card">Searching...</div>
        ) : searchQuery.isError ? (
          <EmptyState title="Search failed" message={getErrorMessage(searchQuery.error)} />
        ) : (
          <ArticleList
            items={searchQuery.data?.items || []}
            emptyTitle="No results"
            emptyMessage="Try a different keyword or check spelling."
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

const ArticleDetailPage = () => {
  const { id } = useParams();
  const articleId = Number(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryCache = useQueryClient();
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [likeState, setLikeState] = useState({ active: false, count: 0 });
  const [bookmarkState, setBookmarkState] = useState({ active: false, count: 0 });

  const articleQuery = useQuery({
    queryKey: ['article', articleId],
    queryFn: () => getArticle(articleId),
    enabled: Number.isFinite(articleId),
  });

  const commentsQuery = useQuery({
    queryKey: ['comments', articleId],
    queryFn: () => listComments(articleId),
    enabled: Number.isFinite(articleId),
  });

  useEffect(() => {
    if (articleQuery.data) {
      setLikeState({
        active: Boolean(articleQuery.data.likedByMe),
        count: articleQuery.data.likeCount ?? 0,
      });
      setBookmarkState({
        active: Boolean(articleQuery.data.bookmarkedByMe),
        count: articleQuery.data.bookmarkCount ?? 0,
      });
    }
  }, [articleQuery.data]);

  const commentMutation = useMutation({
    mutationFn: (payload) => createComment(articleId, payload),
    onSuccess: () => {
      queryCache.invalidateQueries({ queryKey: ['comments', articleId] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      queryCache.invalidateQueries({ queryKey: ['comments', articleId] });
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ id, content }) => updateComment(id, { content }),
    onSuccess: () => {
      queryCache.invalidateQueries({ queryKey: ['comments', articleId] });
    },
  });

  const deleteArticleMutation = useMutation({
    mutationFn: () => deleteArticle(articleId),
    onSuccess: () => {
      navigate('/');
    },
  });

  const visibilityMutation = useMutation({
    mutationFn: (payload) => updateVisibility(articleId, payload),
    onSuccess: () => {
      queryCache.invalidateQueries({ queryKey: ['article', articleId] });
    },
  });

  const applyReactionCounts = (response) => {
    if (!response) {
      return;
    }
    setLikeState((current) => ({
      ...current,
      count: response.likeCount ?? current.count,
    }));
    setBookmarkState((current) => ({
      ...current,
      count: response.bookmarkCount ?? current.count,
    }));
  };

  const handleLike = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    const response = likeState.active
      ? await unlikeArticle(articleId)
      : await likeArticle(articleId);
    applyReactionCounts(response);
    setLikeState((current) => ({ ...current, active: !current.active }));
  };

  const handleBookmark = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    const response = bookmarkState.active
      ? await unbookmarkArticle(articleId)
      : await bookmarkArticle(articleId);
    applyReactionCounts(response);
    setBookmarkState((current) => ({ ...current, active: !current.active }));
  };

  const handleCommentSubmit = async (event) => {
    event.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    const content = commentText.trim();
    if (!content) {
      return;
    }
    await commentMutation.mutateAsync({ content, parentId: replyTo?.id || null });
    setCommentText('');
    setReplyTo(null);
  };

  const handleEditStart = (comment) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.content || '');
  };

  const handleEditCancel = () => {
    setEditingCommentId(null);
    setEditingText('');
  };

  const handleEditSave = async () => {
    const content = editingText.trim();
    if (!content || !editingCommentId) {
      return;
    }
    await updateCommentMutation.mutateAsync({ id: editingCommentId, content });
    handleEditCancel();
  };

  const article = articleQuery.data;
  const isOwner = user && article?.author?.id === user.id;
  const cover = buildImageUrl(article?.thumbnailUrl);

  const renderComment = (comment, depth = 0) => {
    const isReply = depth > 0;
    const canEdit = user && comment.author?.id === user.id;
    const isEditing = editingCommentId === comment.id;
    return (
      <div key={comment.id} className={`comment ${isReply ? 'comment--reply' : ''}`}>
        <div className="comment__header">
          <span className="comment__author">{comment.author?.nickname || 'User'}</span>
          <span>{comment.createdAt ? formatDate(comment.createdAt) : 'Just now'}</span>
        </div>
        {comment.deleted ? (
          <p className="comment__body">This comment was removed.</p>
        ) : isEditing ? (
          <div className="comment-form">
            <textarea
              rows={3}
              value={editingText}
              onChange={(event) => setEditingText(event.target.value)}
            />
            <div className="comment-actions">
              <button
                type="button"
                className="button button--ghost"
                onClick={handleEditCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button--solid"
                onClick={handleEditSave}
                disabled={updateCommentMutation.isPending}
              >
                {updateCommentMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <p className="comment__body">{comment.content}</p>
        )}
        {!comment.deleted && !isEditing && (
          <div className="comment__actions">
            {user && (
              <button type="button" className="link-button" onClick={() => setReplyTo(comment)}>
                Reply
              </button>
            )}
            {canEdit && (
              <button type="button" className="link-button" onClick={() => handleEditStart(comment)}>
                Edit
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                className="link-button"
                onClick={() => deleteCommentMutation.mutate(comment.id)}
              >
                Delete
              </button>
            )}
          </div>
        )}
        {(comment.replies || []).map((reply) => renderComment(reply, depth + 1))}
      </div>
    );
  };

  return (
    <section className="article-page">
      {articleQuery.isLoading ? (
        <div className="card">Loading article...</div>
      ) : articleQuery.isError ? (
        <EmptyState title="Article unavailable" message={getErrorMessage(articleQuery.error)} />
      ) : (
        <>
          <div className="article-header">
            <div className="article-meta">
              <span>{article?.author?.nickname || 'Anonymous'}</span>
              <span>{article?.createdAt ? formatDate(article.createdAt) : 'Unknown date'}</span>
            </div>
            <h1>{article?.title}</h1>
            {article?.summary && <p className="article-summary">{article.summary}</p>}
            <div className="article-info">
              <span>{formatNumber(article?.viewCount ?? 0)} views</span>
              <span>{formatNumber(likeState.count)} likes</span>
              <span>{formatNumber(bookmarkState.count)} bookmarks</span>
            </div>
            <div className="article-actions">
              <button
                type="button"
                className={`action-button ${likeState.active ? 'is-active' : ''}`}
                onClick={handleLike}
              >
                Like <span>{formatNumber(likeState.count)}</span>
              </button>
              <button
                type="button"
                className={`action-button ${bookmarkState.active ? 'is-active' : ''}`}
                onClick={handleBookmark}
              >
                Bookmark <span>{formatNumber(bookmarkState.count)}</span>
              </button>
              {isOwner && (
                <>
                  <Link to={`/editor/${articleId}`} className="action-button">
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="action-button"
                    onClick={() =>
                      visibilityMutation.mutate({ isPublic: !article.isPublic })
                    }
                  >
                    {article.isPublic ? 'Make private' : 'Make public'}
                  </button>
                  <button
                    type="button"
                    className="action-button"
                    onClick={() => deleteArticleMutation.mutate()}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
          {cover && (
            <div className="card">
              <img src={cover} alt="Article cover" />
            </div>
          )}
          <MarkdownPreview text={article?.content || ''} />
          <div className="author-card">
            <div className="author-card__header">
              <div className="author-avatar">{getInitials(article?.author?.nickname || 'A')}</div>
              <div>
                <div className="author-name">{article?.author?.nickname || 'Anonymous'}</div>
                <div className="author-bio">Explore more posts from this author.</div>
              </div>
            </div>
            <Link to={`/profile/${article?.author?.id}`} className="button button--ghost">
              View profile
            </Link>
          </div>
          <section className="comments">
            <div className="comments__header">
              <h3>Comments</h3>
              <span className="filter-label">{(commentsQuery.data || []).length} total</span>
            </div>
            <form className="comment-form" onSubmit={handleCommentSubmit}>
              {replyTo && (
                <div className="draft-badge">
                  Replying to {replyTo.author?.nickname || 'User'}
                  <button type="button" className="link-button" onClick={() => setReplyTo(null)}>
                    Cancel
                  </button>
                </div>
              )}
              <textarea
                rows={4}
                placeholder="Share your thoughts"
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
              />
              <div className="comment-actions">
                <button type="submit" className="button button--solid" disabled={commentMutation.isPending}>
                  {commentMutation.isPending ? 'Posting...' : 'Post comment'}
                </button>
              </div>
            </form>
            {commentsQuery.isLoading ? (
              <div className="card">Loading comments...</div>
            ) : commentsQuery.isError ? (
              <EmptyState title="Comments unavailable" message={getErrorMessage(commentsQuery.error)} />
            ) : (
              <div className="comment-list">
                {(commentsQuery.data || []).map((comment) => renderComment(comment))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
};

const EditorPage = () => {
  const { id } = useParams();
  const articleId = id ? Number(id) : null;
  const isEditing = Number.isFinite(articleId);
  const navigate = useNavigate();
  const queryCache = useQueryClient();
  const [formError, setFormError] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [thumbnailError, setThumbnailError] = useState('');
  const [form, setForm] = useState({
    title: '',
    summary: '',
    content: '',
    tags: '',
    category: '',
    level: '',
    isPublic: true,
  });

  const articleQuery = useQuery({
    queryKey: ['article', articleId],
    queryFn: () => getArticle(articleId),
    enabled: isEditing,
  });

  useEffect(() => {
    if (articleQuery.data) {
      setForm({
        title: articleQuery.data.title || '',
        summary: articleQuery.data.summary || '',
        content: articleQuery.data.content || '',
        tags: (articleQuery.data.tags || []).join(', '),
        category: articleQuery.data.category || '',
        level: articleQuery.data.level || '',
        isPublic: articleQuery.data.isPublic ?? true,
      });
    }
  }, [articleQuery.data]);

  useEffect(() => {
    return () => {
      if (thumbnailPreview) {
        URL.revokeObjectURL(thumbnailPreview);
      }
    };
  }, [thumbnailPreview]);

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      isEditing ? updateArticle(articleId, payload) : createArticle(payload),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      summary: form.summary.trim(),
      isPublic: form.isPublic,
      tags: parseTagsInput(form.tags),
      category: form.category.trim() || null,
      level: form.level.trim() || null,
    };

    try {
      if (thumbnailFile) {
        const validation = validateImageFile(thumbnailFile);
        if (validation) {
          setThumbnailError(validation);
          return;
        }
      }
      const response = await saveMutation.mutateAsync(payload);
      const savedId = isEditing ? articleId : response.id;
      if (thumbnailFile) {
        await uploadThumbnail(savedId, thumbnailFile);
      }
      queryCache.invalidateQueries({ queryKey: ['articles'] });
      navigate(`/article/${savedId}`);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const handleThumbnailChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setThumbnailError('');
      setThumbnailFile(null);
      setThumbnailPreview('');
      return;
    }
    const validation = validateImageFile(file);
    if (validation) {
      setThumbnailError(validation);
      setThumbnailFile(null);
      setThumbnailPreview('');
      return;
    }
    setThumbnailError('');
    setThumbnailFile(file);
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const existingThumbnail = buildImageUrl(articleQuery.data?.thumbnailUrl);
  const previewSource = thumbnailPreview || existingThumbnail;

  return (
    <section className="editor">
      <div className="editor__header">
        <div>
          <span className="section-title">Editor</span>
          <h2>{isEditing ? 'Edit article' : 'Create article'}</h2>
        </div>
        <button type="button" className="button button--ghost" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>
      <form className="editor__layout" onSubmit={handleSubmit}>
        <div className="editor__form">
          <label>
            Title
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="How to structure a devlog"
            />
          </label>
          <label>
            Summary
            <textarea
              rows={3}
              value={form.summary}
              onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
              placeholder="Short abstract for cards and SEO"
            />
          </label>
          <label>
            Content
            <textarea
              rows={12}
              value={form.content}
              onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
              placeholder="Write in Markdown"
            />
          </label>
          <div className="editor__grid">
            <label>
              Tags (comma separated)
              <input
                value={form.tags}
                onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                placeholder="react, spring, devlog"
              />
            </label>
            <label>
              Category
              <input
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                placeholder="Frontend"
              />
            </label>
            <label>
              Level
              <input
                value={form.level}
                onChange={(event) => setForm((current) => ({ ...current, level: event.target.value }))}
                placeholder="Intermediate"
              />
            </label>
            <label>
              Visibility
              <select
                value={form.isPublic ? 'public' : 'private'}
                onChange={(event) =>
                  setForm((current) => ({ ...current, isPublic: event.target.value === 'public' }))
                }
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </label>
          </div>
          <label>
            Thumbnail (jpg, png)
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleThumbnailChange}
            />
          </label>
          {thumbnailError && <div className="form-error">{thumbnailError}</div>}
          {previewSource && (
            <div className="image-preview">
              <img src={previewSource} alt="Thumbnail preview" />
            </div>
          )}
          {formError && <div className="form-error">{formError}</div>}
          <div className="editor__header">
            <button type="submit" className="button button--solid" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
        <div className="editor__preview">
          <div className="section-title">Preview</div>
          <MarkdownPreview text={form.content || 'Start writing to preview your markdown.'} />
        </div>
      </form>
    </section>
  );
};

const ProfilePage = () => {
  const { id } = useParams();
  const userId = Number(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryCache = useQueryClient();
  const isMe = user && user.id === userId;
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseNumberParam(searchParams.get('page'), 1));
  const sort = parseSortParam(searchParams.get('sort'));
  const sortValue = SORT_OPTIONS.find((option) => option.value === sort)?.apiValue;
  const setPage = (nextPage) => {
    setSearchParams(buildSearchParams(searchParams, { page: nextPage, sort, size: PAGE_SIZE }));
  };
  const setSort = (nextSort) => {
    setSearchParams(buildSearchParams(searchParams, { sort: nextSort, page: 1, size: PAGE_SIZE }));
  };
  const [profileForm, setProfileForm] = useState({ nickname: '', bio: '' });
  const [profileError, setProfileError] = useState('');
  const [profileImagePreview, setProfileImagePreview] = useState('');
  const [profileImageError, setProfileImageError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => getUserProfile(userId),
    enabled: Number.isFinite(userId),
  });

  const articlesQuery = useQuery({
    queryKey: ['user-articles', userId, page, sort],
    queryFn: () => listUserArticles(userId, { page: page - 1, size: PAGE_SIZE, sort: sortValue }),
    enabled: Number.isFinite(userId),
  });

  useEffect(() => {
    if (profileQuery.data) {
      setProfileForm({
        nickname: profileQuery.data.nickname || '',
        bio: profileQuery.data.bio || '',
      });
      setIsFollowing(Boolean(profileQuery.data.isFollowing));
    }
  }, [profileQuery.data]);

  useEffect(() => {
    return () => {
      if (profileImagePreview) {
        URL.revokeObjectURL(profileImagePreview);
      }
    };
  }, [profileImagePreview]);

  const updateProfileMutation = useMutation({
    mutationFn: updateMeProfile,
    onSuccess: (data) => {
      queryCache.setQueryData(['profile', userId], data);
    },
  });

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setProfileError('');
    try {
      await updateProfileMutation.mutateAsync(profileForm);
    } catch (error) {
      setProfileError(getErrorMessage(error));
    }
  };

  const handleProfileImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const validation = validateImageFile(file);
    if (validation) {
      setProfileImageError(validation);
      return;
    }
    setProfileImageError('');
    if (profileImagePreview) {
      URL.revokeObjectURL(profileImagePreview);
    }
    setProfileImagePreview(URL.createObjectURL(file));
    try {
      await updateProfileImage(file);
      queryCache.invalidateQueries({ queryKey: ['profile', userId] });
    } catch (error) {
      setProfileImageError(getErrorMessage(error));
    }
  };

  const handleFollow = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (isFollowing) {
      await unfollowUser(userId);
      setIsFollowing(false);
    } else {
      await followUser(userId);
      setIsFollowing(true);
    }
    queryCache.invalidateQueries({ queryKey: ['profile', userId] });
  };

  const profile = profileQuery.data;
  const profileImage = profileImagePreview || buildImageUrl(profile?.profileImageUrl);

  return (
    <section className="profile">
      {profileQuery.isLoading ? (
        <div className="card">Loading profile...</div>
      ) : profileQuery.isError ? (
        <EmptyState title="Profile unavailable" message={getErrorMessage(profileQuery.error)} />
      ) : (
        <>
          <div className="profile__header">
            <div className="profile__avatar">
              {profileImage ? <img src={profileImage} alt="Profile" /> : getInitials(profile?.nickname || 'U')}
            </div>
            <div>
              <h2>{profile?.nickname || 'Anonymous'}</h2>
              <p className="article-summary">{profile?.bio || 'No bio yet.'}</p>
              <div className="profile__actions">
                {isMe ? (
                  <>
                    <label className="button button--ghost">
                      Upload image
                      <input type="file" accept="image/png,image/jpeg" onChange={handleProfileImage} hidden />
                    </label>
                  </>
                ) : (
                  <button type="button" className="button button--solid" onClick={handleFollow}>
                    {isFollowing ? 'Unfollow' : 'Follow'}
                  </button>
                )}
              </div>
              {profileImageError && <div className="form-error">{profileImageError}</div>}
            </div>
          </div>
          <div className="profile__tabs">
            <span className="tag-pill">
              Followers: {formatNumber(profile?.followerCount ?? 0)}
            </span>
            <span className="tag-pill">
              Following: {formatNumber(profile?.followingCount ?? 0)}
            </span>
          </div>
          {isMe && (
            <form className="profile__form" onSubmit={handleProfileSave}>
              <label>
                Nickname
                <input
                  value={profileForm.nickname}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, nickname: event.target.value }))
                  }
                />
              </label>
              <label>
                Bio
                <textarea
                  rows={4}
                  value={profileForm.bio}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, bio: event.target.value }))
                  }
                />
              </label>
              {profileError && <div className="form-error">{profileError}</div>}
              <div className="profile__form-actions">
                <button type="submit" className="button button--solid" disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save profile'}
                </button>
              </div>
            </form>
          )}
          <div className="feed">
            <div className="feed__header">
              <div>
                <span className="section-title">Articles</span>
                <h3>Recent posts</h3>
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
              <div className="card">Loading articles...</div>
            ) : articlesQuery.isError ? (
              <EmptyState title="Articles unavailable" message={getErrorMessage(articlesQuery.error)} />
            ) : (
              <div className="profile__list">
                {(articlesQuery.data?.items || []).map((article) => (
                  <div key={article.id} className="mini-card">
                    <div>
                      <div className="list-title">{article.title}</div>
                      <div className="list-meta">
                        {article.createdAt ? formatDate(article.createdAt) : 'Recently'} -{' '}
                        {formatNumber(article.viewCount ?? 0)} views
                      </div>
                    </div>
                    <Link to={`/article/${article.id}`} className="link-button">
                      Open
                    </Link>
                  </div>
                ))}
              </div>
            )}
            <Pagination
              page={page}
              totalPages={articlesQuery.data?.totalPages ?? 0}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </section>
  );
};

const AuthPage = ({ mode }) => {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ email: '', password: '', nickname: '' });
  const isLogin = mode === 'login';
  const redirectPath = location.state?.from?.pathname || '/';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    try {
      if (isLogin) {
        await login({ email: form.email, password: form.password });
      } else {
        await signup({ email: form.email, password: form.password, nickname: form.nickname });
      }
      navigate(redirectPath, { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  return (
    <section className="auth">
      <div className="auth__card">
        <div className="auth__tabs">
          <Link to="/login" className={`tab ${isLogin ? 'tab--active' : ''}`}>
            Login
          </Link>
          <Link to="/signup" className={`tab ${!isLogin ? 'tab--active' : ''}`}>
            Sign up
          </Link>
        </div>
        <form className="auth__form" onSubmit={handleSubmit}>
          {!isLogin && (
            <label>
              Nickname
              <input
                value={form.nickname}
                onChange={(event) => setForm((current) => ({ ...current, nickname: event.target.value }))}
                placeholder="devloger"
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Password"
            />
          </label>
          {formError && <div className="form-error">{formError}</div>}
          <button type="submit" className="button button--solid">
            {isLogin ? 'Login' : 'Create account'}
          </button>
        </form>
        <div className="auth__divider">or continue with</div>
        <a className="button button--ghost auth__provider" href={`${API_BASE_URL}/oauth2/authorization/google`}>
          Google
        </a>
        <a className="button button--ghost auth__provider" href={`${API_BASE_URL}/oauth2/authorization/github`}>
          GitHub
        </a>
      </div>
    </section>
  );
};

const NotFoundPage = () => (
  <EmptyState
    title="Page not found"
    message="The page you are looking for does not exist."
    action={
      <Link to="/" className="button button--solid">
        Back to home
      </Link>
    }
  />
);

const AppShell = () => {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [notice, setNotice] = useState(null);
  const navigate = useNavigate();
  const queryCache = useQueryClient();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const unsubscribe = subscribeEvents((event) => {
      if (event.type === 'error') {
        setNotice({ type: 'error', message: event.message });
        return;
      }
      if (event.type === 'auth-expired') {
        queryCache.setQueryData(['me'], null);
        setNotice({ type: 'error', message: 'Session expired. Please log in again.' });
        navigate('/login', { replace: true });
      }
    });
    return unsubscribe;
  }, [navigate, queryCache]);

  return (
    <div className="app">
      <Topbar theme={theme} onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
      <GlobalNotice notice={notice} onClose={() => setNotice(null)} />
      <main className="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/trending" element={<TrendingPage />} />
          <Route
            path="/following"
            element={
              <RequireAuth>
                <FollowingPage />
              </RequireAuth>
            }
          />
          <Route path="/tag/:name" element={<TagPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/article/:id" element={<ArticleDetailPage />} />
          <Route
            path="/editor"
            element={
              <RequireAuth>
                <EditorPage />
              </RequireAuth>
            }
          />
          <Route
            path="/editor/:id"
            element={
              <RequireAuth>
                <EditorPage />
              </RequireAuth>
            }
          />
          <Route path="/profile/:id" element={<ProfilePage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <Router>
        <AppShell />
      </Router>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
