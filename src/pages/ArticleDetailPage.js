import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getArticle, deleteArticle, updateVisibility } from '../api/articles';
import { listComments, createComment, updateComment, deleteComment } from '../api/comments';
import { likeArticle, unlikeArticle, bookmarkArticle, unbookmarkArticle } from '../api/reactions';
import { buildPath, ROUTE_PATHS } from '../routes/paths';
import { useAuth } from '../context/AuthContext';
import MarkdownPreview from '../components/MarkdownPreview';
import EmptyState from '../components/EmptyState';
import { buildImageUrl } from '../utils/images';
import { formatDate, formatNumber, getInitials } from '../utils/format';
import { getErrorMessage } from '../utils/requests';

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
    mutationFn: ({ content, parentId }) => createComment(articleId, { content, parentId }),
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

  const deleteCommentMutation = useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      queryCache.invalidateQueries({ queryKey: ['comments', articleId] });
    },
  });

  const deleteArticleMutation = useMutation({
    mutationFn: () => deleteArticle(articleId),
    onSuccess: () => {
      navigate(ROUTE_PATHS.home);
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
      navigate(ROUTE_PATHS.login);
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
      navigate(ROUTE_PATHS.login);
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
      navigate(ROUTE_PATHS.login);
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
          <span className="comment__author">{comment.author?.nickname || '사용자'}</span>
          <span>{comment.createdAt ? formatDate(comment.createdAt) : '방금 전'}</span>
        </div>
        {comment.deleted ? (
          <p className="comment__body">삭제된 댓글입니다.</p>
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
                취소
              </button>
              <button type="button" className="button button--solid" onClick={handleEditSave}>
                저장
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="comment__body">{comment.content}</p>
            <div className="comment-actions">
              <button type="button" className="link-button" onClick={() => setReplyTo(comment)}>
                답글
              </button>
              {canEdit && (
                <>
                  <button type="button" className="link-button" onClick={() => handleEditStart(comment)}>
                    수정
                  </button>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => deleteCommentMutation.mutate(comment.id)}
                  >
                    삭제
                  </button>
                </>
              )}
            </div>
          </>
        )}
        {(comment.replies || []).map((reply) => renderComment(reply, depth + 1))}
      </div>
    );
  };

  return (
    <section className="article-page">
      {articleQuery.isLoading ? (
        <div className="card">글을 불러오는 중...</div>
      ) : articleQuery.isError ? (
        <EmptyState title="글을 불러올 수 없어요" message={getErrorMessage(articleQuery.error)} />
      ) : (
        <>
          <div className="article-hero">
            <div className="article-title">
              <span className="section-title">글</span>
              <h2>{article?.title || '제목 없음'}</h2>
            </div>
            {article?.summary && <p className="article-summary">{article.summary}</p>}
            <div className="article-info">
              <span>{formatNumber(article?.viewCount ?? 0)} 조회</span>
              <span>{formatNumber(likeState.count)} 좋아요</span>
              <span>{formatNumber(bookmarkState.count)} 북마크</span>
            </div>
            <div className="article-actions">
              <button
                type="button"
                className={`action-button ${likeState.active ? 'is-active' : ''}`}
                onClick={handleLike}
              >
                좋아요 <span>{formatNumber(likeState.count)}</span>
              </button>
              <button
                type="button"
                className={`action-button ${bookmarkState.active ? 'is-active' : ''}`}
                onClick={handleBookmark}
              >
                북마크 <span>{formatNumber(bookmarkState.count)}</span>
              </button>
              {isOwner && (
                <>
                  <Link to={buildPath.editorEdit(articleId)} className="action-button">
                    수정
                  </Link>
                  <button
                    type="button"
                    className="action-button"
                    onClick={() => visibilityMutation.mutate({ isPublic: !article.isPublic })}
                  >
                    {article.isPublic ? '비공개로 전환' : '공개로 전환'}
                  </button>
                  <button
                    type="button"
                    className="action-button"
                    onClick={() => deleteArticleMutation.mutate()}
                  >
                    삭제
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
              <div className="author-avatar">{getInitials(article?.author?.nickname || '익명')}</div>
              <div>
                <div className="author-name">{article?.author?.nickname || '익명'}</div>
                <div className="author-bio">작성자의 다른 글도 확인해보세요.</div>
              </div>
            </div>
            <Link to={buildPath.profile(article?.author?.id)} className="button button--ghost">
              프로필 보기
            </Link>
          </div>
          <section className="comments">
            <div className="comments__header">
              <h3>댓글</h3>
              <span className="filter-label">총 {(commentsQuery.data || []).length}개</span>
            </div>
            <form className="comment-form" onSubmit={handleCommentSubmit}>
              {replyTo && (
                <div className="draft-badge">
                  답글 대상 {replyTo.author?.nickname || '사용자'}
                  <button type="button" className="link-button" onClick={() => setReplyTo(null)}>
                    취소
                  </button>
                </div>
              )}
              <textarea
                rows={4}
                placeholder="댓글을 입력하세요"
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
              />
              <div className="comment-actions">
                <button type="submit" className="button button--solid" disabled={commentMutation.isPending}>
                  {commentMutation.isPending ? '등록 중...' : '댓글 등록'}
                </button>
              </div>
            </form>
            {commentsQuery.isLoading ? (
              <div className="card">댓글을 불러오는 중...</div>
            ) : commentsQuery.isError ? (
              <EmptyState title="댓글을 불러올 수 없어요" message={getErrorMessage(commentsQuery.error)} />
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

export default ArticleDetailPage;
