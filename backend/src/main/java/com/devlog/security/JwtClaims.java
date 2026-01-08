package com.devlog.security;

import java.time.Instant;

public record JwtClaims(String subject, String type, String tokenId, Instant expiresAt) {
}
