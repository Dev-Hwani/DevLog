package com.devlog.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UserUpdateRequest(
    @NotBlank @Size(max = 100) String nickname,
    @Size(max = 2000) String bio
) {
}
