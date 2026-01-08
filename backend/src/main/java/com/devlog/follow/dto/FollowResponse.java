package com.devlog.follow.dto;

import com.devlog.user.dto.UserSummary;
import java.time.LocalDateTime;

public record FollowResponse(UserSummary user, LocalDateTime followedAt) {
}
