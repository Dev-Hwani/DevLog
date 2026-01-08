package com.devlog.article;

import com.devlog.article.dto.ArticleResponse;
import com.devlog.article.dto.ArticleSummaryResponse;
import com.devlog.domain.Article;
import com.devlog.domain.Tag;
import com.devlog.user.dto.UserSummary;
import java.util.List;

public class ArticleMapper {
    private ArticleMapper() {
    }

    public static ArticleSummaryResponse toSummary(Article article) {
        return toSummary(article, 0, false, false);
    }

    public static ArticleSummaryResponse toSummary(
        Article article,
        long bookmarkCount,
        boolean likedByMe,
        boolean bookmarkedByMe
    ) {
        List<String> tags = article.getTags().stream()
            .map(Tag::getName)
            .toList();
        String thumbnailUrl = article.getThumbnail() != null && article.getThumbnail().length > 0
            ? "/api/articles/" + article.getId() + "/thumbnail"
            : null;
        return new ArticleSummaryResponse(
            article.getId(),
            article.getTitle(),
            article.getSummary(),
            UserSummary.from(article.getAuthor()),
            tags,
            thumbnailUrl,
            article.getViewCount(),
            article.getLikeCount(),
            bookmarkCount,
            likedByMe,
            bookmarkedByMe,
            article.getCreatedAt()
        );
    }

    public static ArticleResponse toResponse(Article article) {
        return toResponse(article, 0, false, false);
    }

    public static ArticleResponse toResponse(
        Article article,
        long bookmarkCount,
        boolean likedByMe,
        boolean bookmarkedByMe
    ) {
        List<String> tags = article.getTags().stream()
            .map(Tag::getName)
            .toList();
        String thumbnailUrl = article.getThumbnail() != null && article.getThumbnail().length > 0
            ? "/api/articles/" + article.getId() + "/thumbnail"
            : null;
        return new ArticleResponse(
            article.getId(),
            article.getTitle(),
            article.getSummary(),
            article.getContent(),
            UserSummary.from(article.getAuthor()),
            tags,
            article.getCategory(),
            article.getLevel(),
            thumbnailUrl,
            article.isPublic(),
            article.getViewCount(),
            article.getLikeCount(),
            bookmarkCount,
            likedByMe,
            bookmarkedByMe,
            article.getCreatedAt(),
            article.getUpdatedAt()
        );
    }
}
