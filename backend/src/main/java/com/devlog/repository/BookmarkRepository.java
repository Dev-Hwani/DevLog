package com.devlog.repository;

import com.devlog.domain.Bookmark;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {
    Optional<Bookmark> findByArticleIdAndUserId(Long articleId, Long userId);

    boolean existsByArticleIdAndUserId(Long articleId, Long userId);

    @Query("SELECT b.article.id FROM Bookmark b WHERE b.user.id = :userId AND b.article.id IN :articleIds")
    List<Long> findArticleIdsByUserIdAndArticleIdIn(
        @Param("userId") Long userId,
        @Param("articleIds") List<Long> articleIds
    );

    @Query("""
        SELECT b.article.id FROM Bookmark b
        WHERE b.user.id = :userId
          AND b.article.isDeleted = false
          AND b.article.isPublic = true
        ORDER BY b.createdAt DESC
        """)
    List<Long> findBookmarkedArticleIds(@Param("userId") Long userId, Pageable pageable);

    @Query("""
        SELECT COUNT(b) FROM Bookmark b
        WHERE b.user.id = :userId
          AND b.article.isDeleted = false
          AND b.article.isPublic = true
        """)
    long countBookmarkedArticles(@Param("userId") Long userId);

    long countByArticleId(Long articleId);
}
