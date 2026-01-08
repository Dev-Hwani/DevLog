package com.devlog.article.dto;

import com.devlog.user.dto.UserSummary;
import java.time.LocalDateTime;
import java.util.List;

public record ArticleSummaryResponse(
    Long id,
    String title,
    String summary,
    UserSummary author,
    List<String> tags,
    String thumbnailUrl,
    long viewCount,
    long likeCount,
    long bookmarkCount,
    boolean likedByMe,
    boolean bookmarkedByMe,
    LocalDateTime createdAt
) {
}
