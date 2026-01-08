package com.devlog.repository;

import com.devlog.domain.Tag;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface TagRepository extends JpaRepository<Tag, Long> {
    Optional<Tag> findByName(String name);

    @Query(
        value = """
            SELECT t.name AS name, COUNT(a.id) AS count
            FROM tags t
            LEFT JOIN article_tags at ON t.id = at.tag_id
            LEFT JOIN articles a ON a.id = at.article_id AND a.is_deleted = 0 AND a.is_public = 1
            GROUP BY t.id, t.name
            ORDER BY count DESC
            """,
        nativeQuery = true
    )
    List<TagCountProjection> findTagCounts();

    interface TagCountProjection {
        String getName();
        long getCount();
    }
}
