CREATE INDEX idx_articles_public_latest
  ON articles (is_deleted, is_public, created_at DESC, id DESC);

CREATE INDEX idx_articles_public_views
  ON articles (is_deleted, is_public, view_count DESC, id DESC);

CREATE INDEX idx_articles_public_likes
  ON articles (is_deleted, is_public, like_count DESC, id DESC);

CREATE INDEX idx_articles_feed_author_created
  ON articles (is_deleted, is_public, user_id, created_at DESC, id DESC);

CREATE INDEX idx_articles_trending
  ON articles (is_deleted, is_public, view_count DESC, like_count DESC, id DESC);

CREATE INDEX idx_article_tags_tag_article
  ON article_tags (tag_id, article_id);
