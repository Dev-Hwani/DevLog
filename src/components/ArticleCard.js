import { Link, useNavigate } from 'react-router-dom';
import { buildPath } from '../routes/paths';
import { buildImageUrl } from '../utils/images';
import { buildSummary } from '../utils/text';
import { formatDate, formatNumber } from '../utils/format';

const buildCoverStyle = (url) => ({
  backgroundImage: url
    ? `url(${url})`
    : 'linear-gradient(135deg, rgba(18, 184, 134, 0.35), rgba(34, 139, 230, 0.35))',
});

const ArticleCard = ({ article, variant = 'default' }) => {
  const navigate = useNavigate();
  const thumbnail = buildImageUrl(article?.thumbnailUrl);
  const tags = article?.tags || [];

  const handleOpen = () => {
    if (article?.id) {
      navigate(buildPath.article(article.id));
    }
  };

  return (
    <article className={`post-card ${variant === 'featured' ? 'featured' : ''}`}>
      <button
        type="button"
        className="post-cover"
        style={buildCoverStyle(thumbnail)}
        onClick={handleOpen}
        aria-label="글 열기"
      />
      <div className="post-body">
        <div className="post-meta">
          <span>{article?.author?.nickname || '익명'}</span>
          <span>{article?.createdAt ? formatDate(article.createdAt) : '날짜 미상'}</span>
        </div>
        <button type="button" className="post-title" onClick={handleOpen}>
          {article?.title || '제목 없음'}
        </button>
        {buildSummary(article) && <p className="article-summary">{buildSummary(article)}</p>}
        {tags.length > 0 && (
          <div className="post-tags">
            {tags.map((tag) => (
              <Link key={tag} to={buildPath.tag(tag)} className="tag-pill">
                {tag}
              </Link>
            ))}
          </div>
        )}
        <div className="post-footer">
          <span>{formatNumber(article?.viewCount ?? 0)} 조회</span>
          <span>{formatNumber(article?.likeCount ?? 0)} 좋아요</span>
        </div>
      </div>
    </article>
  );
};

export default ArticleCard;
