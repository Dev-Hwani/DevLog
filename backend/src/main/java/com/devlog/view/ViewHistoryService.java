package com.devlog.view;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ViewHistoryService {
    private static final String KEY_PREFIX = "viewed:";
    private final StringRedisTemplate redisTemplate;

    public void recordView(Long userId, Long articleId) {
        if (userId == null || articleId == null) {
            return;
        }
        redisTemplate.opsForZSet()
            .add(key(userId), String.valueOf(articleId), Instant.now().toEpochMilli());
    }

    public List<Long> listViewedArticleIds(Long userId, int page, int size) {
        if (userId == null) {
            return Collections.emptyList();
        }
        long start = Math.max(page, 1) - 1L;
        start = start * size;
        long end = start + size - 1;
        Set<String> ids = redisTemplate.opsForZSet().reverseRange(key(userId), start, end);
        if (ids == null || ids.isEmpty()) {
            return Collections.emptyList();
        }
        return ids.stream().map(Long::valueOf).toList();
    }

    public long countViewedArticles(Long userId) {
        if (userId == null) {
            return 0;
        }
        Long total = redisTemplate.opsForZSet().zCard(key(userId));
        return total == null ? 0 : total;
    }

    public void removeViews(Long userId, List<Long> articleIds) {
        if (userId == null || articleIds == null || articleIds.isEmpty()) {
            return;
        }
        Object[] members = articleIds.stream().map(String::valueOf).toArray();
        redisTemplate.opsForZSet().remove(key(userId), members);
    }

    private String key(Long userId) {
        return KEY_PREFIX + userId;
    }
}
