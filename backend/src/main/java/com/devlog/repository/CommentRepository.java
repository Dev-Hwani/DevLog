package com.devlog.repository;

import com.devlog.domain.Comment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    @Query("""
        SELECT c FROM Comment c
        JOIN FETCH c.author
        LEFT JOIN FETCH c.parent
        WHERE c.article.id = :articleId
        ORDER BY c.createdAt ASC
        """)
    List<Comment> findByArticleIdWithAuthor(@Param("articleId") Long articleId);

    long countByArticleIdAndIsDeletedFalse(Long articleId);
}
