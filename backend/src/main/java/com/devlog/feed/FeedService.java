package com.devlog.feed;

import com.devlog.article.ArticleMapper;
import com.devlog.article.dto.ArticleSummaryResponse;
import com.devlog.common.CursorResponse;
import com.devlog.common.CursorUtil;
import com.devlog.domain.Article;
import com.devlog.repository.ArticleRepository;
import com.devlog.repository.BookmarkRepository;
import com.devlog.repository.LikeRepository;
import com.devlog.security.UserPrincipal;
import com.devlog.follow.FollowService;
import java.time.LocalDateTime;
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
    private final ArticleRepository articleRepository;
    private final FollowService followService;
    private final LikeRepository likeRepository;
    private final BookmarkRepository bookmarkRepository;

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public CursorResponse<ArticleSummaryResponse> followingFeed(UserPrincipal principal, String cursor, int size) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        List<Long> followingIds = followService.getFollowingIds(principal.getId());
        if (followingIds.isEmpty()) {
            return new CursorResponse<>(Collections.emptyList(), null, size);
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
        return new CursorResponse<>(items, nextCursor, size);
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public CursorResponse<ArticleSummaryResponse> trendingFeed(UserPrincipal principal, String cursor, int size) {
        CursorUtil.TrendCursor decoded = CursorUtil.decodeTrendCursor(cursor);
        Long cursorView = decoded == null ? null : decoded.viewCount();
        Long cursorLike = decoded == null ? null : decoded.likeCount();
        Long cursorId = decoded == null ? null : decoded.id();
        LocalDateTime since = LocalDateTime.now().minusHours(24);
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
        return new CursorResponse<>(items, nextCursor, size);
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
}
