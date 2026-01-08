ALTER TABLE articles
  ADD COLUMN like_count BIGINT NOT NULL DEFAULT 0;

CREATE FULLTEXT INDEX ft_articles_title_content ON articles (title, content);
