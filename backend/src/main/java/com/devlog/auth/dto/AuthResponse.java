package com.devlog.auth.dto;

import com.devlog.domain.User;

public record AuthResponse(Long id, String email, String nickname, String role) {
    public static AuthResponse from(User user) {
        return new AuthResponse(user.getId(), user.getEmail(), user.getNickname(), user.getRole().name());
    }
}
