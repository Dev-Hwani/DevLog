package com.devlog.security;

import java.time.Duration;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RefreshTokenStore {
    private static final String KEY_PREFIX = "refresh:";
    private final StringRedisTemplate redisTemplate;

    public void store(String tokenId, Long userId, Instant expiresAt) {
        Duration ttl = Duration.between(Instant.now(), expiresAt);
        if (ttl.isNegative()) {
            ttl = Duration.ZERO;
        }
        redisTemplate.opsForValue().set(key(tokenId), String.valueOf(userId), ttl);
    }

    public boolean matches(String tokenId, Long userId) {
        String value = redisTemplate.opsForValue().get(key(tokenId));
        return value != null && value.equals(String.valueOf(userId));
    }

    public void delete(String tokenId) {
        redisTemplate.delete(key(tokenId));
    }

    private String key(String tokenId) {
        return KEY_PREFIX + tokenId;
    }
}
