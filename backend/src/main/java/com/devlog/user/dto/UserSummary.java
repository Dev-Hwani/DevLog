package com.devlog.user.dto;

import com.devlog.domain.User;

public record UserSummary(Long id, String nickname, String profileImageUrl) {
    public static UserSummary from(User user) {
        String imageUrl = null;
        if (user.getProfileImage() != null && user.getProfileImage().length > 0) {
            imageUrl = "/api/users/" + user.getId() + "/profile-image";
        }
        return new UserSummary(user.getId(), user.getNickname(), imageUrl);
    }
}
