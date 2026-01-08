package com.devlog.user.dto;

import com.devlog.domain.User;
import java.time.LocalDateTime;

public record UserProfileResponse(
    Long id,
    String email,
    String nickname,
    String bio,
    String profileImageUrl,
    long followerCount,
    long followingCount,
    boolean isFollowing,
    LocalDateTime createdAt
) {
    public static UserProfileResponse from(
        User user,
        boolean includeEmail,
        long followerCount,
        long followingCount,
        boolean isFollowing
    ) {
        String imageUrl = null;
        if (user.getProfileImage() != null && user.getProfileImage().length > 0) {
            imageUrl = "/api/users/" + user.getId() + "/profile-image";
        }
        return new UserProfileResponse(
            user.getId(),
            includeEmail ? user.getEmail() : null,
            user.getNickname(),
            user.getBio(),
            imageUrl,
            followerCount,
            followingCount,
            isFollowing,
            user.getCreatedAt()
        );
    }
}
