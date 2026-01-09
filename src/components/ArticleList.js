import EmptyState from './EmptyState';
import ArticleCard from './ArticleCard';

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

export default ArticleList;
