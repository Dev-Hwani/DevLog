package com.devlog.article.dto;

import com.devlog.user.dto.UserSummary;
import java.time.LocalDateTime;
import java.util.List;

public record ArticleResponse(
    Long id,
    String title,
    String summary,
    String content,
    UserSummary author,
    List<String> tags,
    String category,
    String level,
    String thumbnailUrl,
    boolean isPublic,
    long viewCount,
    long likeCount,
    long bookmarkCount,
    boolean likedByMe,
    boolean bookmarkedByMe,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}
