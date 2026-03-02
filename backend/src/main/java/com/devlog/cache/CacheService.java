package com.devlog.cache;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CacheService {
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public <T> T read(String key, Class<T> type) {
        String payload = redisTemplate.opsForValue().get(key);
        if (payload == null) {
            return null;
        }
        try {
            return objectMapper.readValue(payload, type);
        } catch (IOException ex) {
            redisTemplate.delete(key);
            return null;
        }
    }

    public <T> T read(String key, TypeReference<T> type) {
        String payload = redisTemplate.opsForValue().get(key);
        if (payload == null) {
            return null;
        }
        try {
            return objectMapper.readValue(payload, type);
        } catch (IOException ex) {
            redisTemplate.delete(key);
            return null;
        }
    }

    public void write(String key, Object value, Duration ttl) {
        try {
            String payload = objectMapper.writeValueAsString(value);
            if (ttl == null || ttl.isZero() || ttl.isNegative()) {
                redisTemplate.opsForValue().set(key, payload);
                return;
            }
            redisTemplate.opsForValue().set(key, payload, ttl);
        } catch (JsonProcessingException ex) {
            // Ignore cache write failures.
        }
    }

    public String readString(String key) {
        return redisTemplate.opsForValue().get(key);
    }

    public long increment(String key) {
        try {
            Long value = redisTemplate.opsForValue().increment(key);
            return value == null ? 0 : value;
        } catch (RuntimeException ex) {
            return 0;
        }
    }

    public void delete(String key) {
        redisTemplate.delete(key);
    }
}
