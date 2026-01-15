package com.devlog.repository;

import com.devlog.domain.Article;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ArticleRepository extends JpaRepository<Article, Long> {
    @EntityGraph(attributePaths = {"author", "tags"})
    Optional<Article> findByIdAndIsDeletedFalse(Long id);

    @EntityGraph(attributePaths = {"author", "tags"})
    List<Article> findByIdIn(List<Long> ids);

    Page<Article> findByIsDeletedFalseAndIsPublicTrue(Pageable pageable);

    Page<Article> findByAuthorIdAndIsDeletedFalse(Long authorId, Pageable pageable);

    Page<Article> findByAuthorIdAndIsDeletedFalseAndIsPublicTrue(Long authorId, Pageable pageable);

    @Query("""
        SELECT a FROM Article a
        WHERE a.isDeleted = false
          AND a.isPublic = true
          AND a.author.id IN :authorIds
          AND (:cursorTime IS NULL
            OR a.createdAt < :cursorTime
            OR (a.createdAt = :cursorTime AND a.id < :cursorId))
        ORDER BY a.createdAt DESC, a.id DESC
        """)
    List<Article> findFeed(
        @Param("authorIds") List<Long> authorIds,
        @Param("cursorTime") LocalDateTime cursorTime,
        @Param("cursorId") Long cursorId,
        Pageable pageable
    );

    @Query("""
        SELECT a FROM Article a
        WHERE a.isDeleted = false
          AND a.isPublic = true
          AND (:since IS NULL OR a.createdAt >= :since)
          AND (:cursorView IS NULL
            OR a.viewCount < :cursorView
            OR (a.viewCount = :cursorView AND a.likeCount < :cursorLike)
            OR (a.viewCount = :cursorView AND a.likeCount = :cursorLike AND a.id < :cursorId))
        ORDER BY a.viewCount DESC, a.likeCount DESC, a.id DESC
        """)
    List<Article> findTrending(
        @Param("since") LocalDateTime since,
        @Param("cursorView") Long cursorView,
        @Param("cursorLike") Long cursorLike,
        @Param("cursorId") Long cursorId,
        Pageable pageable
    );

    @Query("""
        SELECT a FROM Article a
        JOIN a.tags t
        WHERE a.isDeleted = false
          AND a.isPublic = true
          AND t.name = :tag
        """)
    Page<Article> findPublicByTagName(@Param("tag") String tag, Pageable pageable);

    @Query(
        value = """
            SELECT * FROM articles
            WHERE is_deleted = 0 AND is_public = 1
              AND MATCH(title, content) AGAINST (:keyword IN NATURAL LANGUAGE MODE)
            """,
        countQuery = """
            SELECT COUNT(*) FROM articles
            WHERE is_deleted = 0 AND is_public = 1
              AND MATCH(title, content) AGAINST (:keyword IN NATURAL LANGUAGE MODE)
            """,
        nativeQuery = true
    )
    Page<Article> searchPublic(@Param("keyword") String keyword, Pageable pageable);

    @Modifying
    @Query("UPDATE Article a SET a.viewCount = a.viewCount + 1 WHERE a.id = :id")
    void incrementViewCount(@Param("id") Long id);

    @Modifying
    @Query("UPDATE Article a SET a.likeCount = a.likeCount + 1 WHERE a.id = :id")
    void incrementLikeCount(@Param("id") Long id);

    @Modifying
    @Query("UPDATE Article a SET a.likeCount = CASE WHEN a.likeCount > 0 THEN a.likeCount - 1 ELSE 0 END WHERE a.id = :id")
    void decrementLikeCount(@Param("id") Long id);

    @Modifying
    @Query("UPDATE Article a SET a.bookmarkCount = a.bookmarkCount + 1 WHERE a.id = :id")
    void incrementBookmarkCount(@Param("id") Long id);

    @Modifying
    @Query("UPDATE Article a SET a.bookmarkCount = CASE WHEN a.bookmarkCount > 0 THEN a.bookmarkCount - 1 ELSE 0 END WHERE a.id = :id")
    void decrementBookmarkCount(@Param("id") Long id);
}
