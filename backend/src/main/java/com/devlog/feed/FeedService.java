package com.devlog.feed;

import com.devlog.article.ArticleMapper;
import com.devlog.article.dto.ArticleSummaryResponse;
import com.devlog.cache.CacheService;
import com.devlog.common.CursorResponse;
import com.devlog.common.CursorUtil;
import com.devlog.domain.Article;
import com.devlog.repository.ArticleRepository;
import com.devlog.repository.BookmarkRepository;
import com.devlog.repository.LikeRepository;
import com.devlog.security.UserPrincipal;
import com.devlog.follow.FollowService;
import com.fasterxml.jackson.core.type.TypeReference;
import java.time.LocalDateTime;
import java.time.Duration;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class FeedService {
    private static final Duration TRENDING_CACHE_TTL = Duration.ofMinutes(1);
    private static final Duration FOLLOWING_CACHE_TTL = Duration.ofSeconds(30);

    private final ArticleRepository articleRepository;
    private final FollowService followService;
    private final LikeRepository likeRepository;
    private final BookmarkRepository bookmarkRepository;
    private final CacheService cacheService;

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public CursorResponse<ArticleSummaryResponse> followingFeed(UserPrincipal principal, String cursor, int size) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        String cacheKey = buildFollowingCacheKey(principal.getId(), cursor, size);
        CursorResponse<ArticleSummaryResponse> cached = cacheService.read(
            cacheKey,
            new TypeReference<CursorResponse<ArticleSummaryResponse>>() {}
        );
        if (cached != null) {
            return cached;
        }

        List<Long> followingIds = followService.getFollowingIds(principal.getId());
        if (followingIds.isEmpty()) {
            CursorResponse<ArticleSummaryResponse> empty = new CursorResponse<>(Collections.emptyList(), null, size);
            cacheService.write(cacheKey, empty, FOLLOWING_CACHE_TTL);
            return empty;
        }
        CursorUtil.TimeCursor decoded = CursorUtil.decodeTimeCursor(cursor);
        LocalDateTime cursorTime = decoded == null ? null : decoded.time();
        Long cursorId = decoded == null ? null : decoded.id();
        List<Article> articles = articleRepository.findFeed(
            followingIds,
            cursorTime,
            cursorId,
            PageRequest.of(0, size)
        );
        String nextCursor = null;
        if (!articles.isEmpty()) {
            Article last = articles.get(articles.size() - 1);
            nextCursor = CursorUtil.encodeTimeCursor(last.getCreatedAt(), last.getId());
        }
        List<ArticleSummaryResponse> items = buildSummaries(articles, principal);
        CursorResponse<ArticleSummaryResponse> response = new CursorResponse<>(items, nextCursor, size);
        cacheService.write(cacheKey, response, FOLLOWING_CACHE_TTL);
        return response;
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public CursorResponse<ArticleSummaryResponse> trendingFeed(
        UserPrincipal principal,
        String range,
        String cursor,
        int size
    ) {
        if (principal == null) {
            String cacheKey = buildTrendingCacheKey(range, cursor, size);
            CursorResponse<ArticleSummaryResponse> cached = cacheService.read(
                cacheKey,
                new TypeReference<CursorResponse<ArticleSummaryResponse>>() {}
            );
            if (cached != null) {
                return cached;
            }
        }

        CursorUtil.TrendCursor decoded = CursorUtil.decodeTrendCursor(cursor);
        Long cursorView = decoded == null ? null : decoded.viewCount();
        Long cursorLike = decoded == null ? null : decoded.likeCount();
        Long cursorId = decoded == null ? null : decoded.id();
        LocalDateTime since = resolveTrendingSince(range);
        List<Article> articles = articleRepository.findTrending(
            since,
            cursorView,
            cursorLike,
            cursorId,
            PageRequest.of(0, size)
        );
        String nextCursor = null;
        if (!articles.isEmpty()) {
            Article last = articles.get(articles.size() - 1);
            nextCursor = CursorUtil.encodeTrendCursor(last.getViewCount(), last.getLikeCount(), last.getId());
        }
        List<ArticleSummaryResponse> items = buildSummaries(articles, principal);
        CursorResponse<ArticleSummaryResponse> response = new CursorResponse<>(items, nextCursor, size);
        if (principal == null) {
            cacheService.write(buildTrendingCacheKey(range, cursor, size), response, TRENDING_CACHE_TTL);
        }
        return response;
    }

    private List<ArticleSummaryResponse> buildSummaries(List<Article> articles, UserPrincipal principal) {
        if (articles.isEmpty()) {
            return Collections.emptyList();
        }
        Long userId = principal == null ? null : principal.getId();
        Set<Long> likedIds = Collections.emptySet();
        Set<Long> bookmarkedIds = Collections.emptySet();

        if (userId != null) {
            List<Long> articleIds = articles.stream().map(Article::getId).toList();
            likedIds = new HashSet<>(likeRepository.findArticleIdsByUserIdAndArticleIdIn(userId, articleIds));
            bookmarkedIds = new HashSet<>(
                bookmarkRepository.findArticleIdsByUserIdAndArticleIdIn(userId, articleIds)
            );
        }

        Set<Long> finalLikedIds = likedIds;
        Set<Long> finalBookmarkedIds = bookmarkedIds;
        return articles.stream()
            .map(article -> ArticleMapper.toSummary(
                article,
                article.getBookmarkCount(),
                finalLikedIds.contains(article.getId()),
                finalBookmarkedIds.contains(article.getId())
            ))
            .toList();
    }

    private String buildTrendingCacheKey(String range, String cursor, int size) {
        String normalizedRange = normalizeRange(range);
        String normalized = (cursor == null || cursor.isBlank()) ? "first" : cursor;
        return "cache:feed:trending:" + normalizedRange + ":" + normalized + ":" + size;
    }

    private String buildFollowingCacheKey(Long userId, String cursor, int size) {
        String normalized = (cursor == null || cursor.isBlank()) ? "first" : cursor;
        return "cache:feed:following:" + userId + ":" + normalized + ":" + size;
    }

    private LocalDateTime resolveTrendingSince(String range) {
        String normalized = normalizeRange(range);
        return switch (normalized) {
            case "all" -> null;
            case "7d" -> LocalDateTime.now().minusDays(7);
            default -> LocalDateTime.now().minusHours(24);
        };
    }

    private String normalizeRange(String range) {
        if (range == null) {
            return "24h";
        }
        String normalized = range.trim().toLowerCase();
        if (normalized.equals("all") || normalized.equals("7d") || normalized.equals("24h")) {
            return normalized;
        }
        return "24h";
    }
}
