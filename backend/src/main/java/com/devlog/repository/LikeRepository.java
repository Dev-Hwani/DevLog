package com.devlog.repository;

import com.devlog.domain.Like;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LikeRepository extends JpaRepository<Like, Long> {
    Optional<Like> findByArticleIdAndUserId(Long articleId, Long userId);

    boolean existsByArticleIdAndUserId(Long articleId, Long userId);

    @Query("SELECT l.article.id FROM Like l WHERE l.user.id = :userId AND l.article.id IN :articleIds")
    List<Long> findArticleIdsByUserIdAndArticleIdIn(
        @Param("userId") Long userId,
        @Param("articleIds") List<Long> articleIds
    );

    long countByArticleId(Long articleId);
}
