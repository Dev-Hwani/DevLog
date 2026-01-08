package com.devlog.security;

import java.time.Instant;

public record TokenPair(String accessToken, String refreshToken, String refreshTokenId, Instant refreshExpiresAt) {
}
