package com.devlog.comment.dto;

import com.devlog.user.dto.UserSummary;
import java.time.LocalDateTime;
import java.util.List;

public record CommentResponse(
    Long id,
    String content,
    UserSummary author,
    Long parentId,
    boolean deleted,
    LocalDateTime createdAt,
    List<CommentResponse> replies
) {
}
