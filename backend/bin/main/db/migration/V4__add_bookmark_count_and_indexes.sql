ALTER TABLE articles
  ADD COLUMN bookmark_count BIGINT NOT NULL DEFAULT 0;

UPDATE articles a
SET bookmark_count = (
  SELECT COUNT(*) FROM bookmarks b WHERE b.article_id = a.id
);

CREATE INDEX idx_likes_user ON likes(user_id);
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);
