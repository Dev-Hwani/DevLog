package com.devlog.reaction;

import com.devlog.cache.CacheService;
import com.devlog.domain.Article;
import com.devlog.domain.Bookmark;
import com.devlog.domain.Like;
import com.devlog.domain.User;
import com.devlog.reaction.dto.ReactionResponse;
import com.devlog.repository.ArticleRepository;
import com.devlog.repository.BookmarkRepository;
import com.devlog.repository.LikeRepository;
import com.devlog.repository.UserRepository;
import com.devlog.security.UserPrincipal;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ReactionService {
    private static final String ARTICLE_DETAIL_CACHE_PREFIX = "cache:article:detail:";
    private static final String ARTICLE_LIST_CACHE_VERSION_KEY = "cache:articles:list:version";

    private final ArticleRepository articleRepository;
    private final LikeRepository likeRepository;
    private final BookmarkRepository bookmarkRepository;
    private final UserRepository userRepository;
    private final CacheService cacheService;

    @Transactional
    public ReactionResponse likeArticle(Long articleId, UserPrincipal principal) {
        User user = getCurrentUser(principal);
        Article article = getAccessibleArticle(articleId, user);
        Optional<Like> existing = likeRepository.findByArticleIdAndUserId(articleId, user.getId());
        if (existing.isEmpty()) {
            Like like = new Like();
            like.setArticle(article);
            like.setUser(user);
            likeRepository.save(like);
            articleRepository.incrementLikeCount(articleId);
            article.setLikeCount(article.getLikeCount() + 1);
        }
        invalidateArticleDetailCache(articleId);
        bumpArticleListCacheVersion();
        return new ReactionResponse(article.getLikeCount(), article.getBookmarkCount());
    }

    @Transactional
    public ReactionResponse unlikeArticle(Long articleId, UserPrincipal principal) {
        User user = getCurrentUser(principal);
        Article article = getAccessibleArticle(articleId, user);
        likeRepository.findByArticleIdAndUserId(articleId, user.getId()).ifPresent(like -> {
            likeRepository.delete(like);
            articleRepository.decrementLikeCount(articleId);
            article.setLikeCount(Math.max(0, article.getLikeCount() - 1));
        });
        invalidateArticleDetailCache(articleId);
        bumpArticleListCacheVersion();
        return new ReactionResponse(article.getLikeCount(), article.getBookmarkCount());
    }

    @Transactional
    public ReactionResponse bookmarkArticle(Long articleId, UserPrincipal principal) {
        User user = getCurrentUser(principal);
        Article article = getAccessibleArticle(articleId, user);
        Optional<Bookmark> existing = bookmarkRepository.findByArticleIdAndUserId(articleId, user.getId());
        if (existing.isEmpty()) {
            Bookmark bookmark = new Bookmark();
            bookmark.setArticle(article);
            bookmark.setUser(user);
            bookmarkRepository.save(bookmark);
            articleRepository.incrementBookmarkCount(articleId);
            article.setBookmarkCount(article.getBookmarkCount() + 1);
        }
        invalidateArticleDetailCache(articleId);
        bumpArticleListCacheVersion();
        long likeCount = article.getLikeCount();
        return new ReactionResponse(likeCount, article.getBookmarkCount());
    }

    @Transactional
    public ReactionResponse unbookmarkArticle(Long articleId, UserPrincipal principal) {
        User user = getCurrentUser(principal);
        Article article = getAccessibleArticle(articleId, user);
        bookmarkRepository.findByArticleIdAndUserId(articleId, user.getId()).ifPresent(bookmark -> {
            bookmarkRepository.delete(bookmark);
            articleRepository.decrementBookmarkCount(articleId);
            article.setBookmarkCount(Math.max(0, article.getBookmarkCount() - 1));
        });
        invalidateArticleDetailCache(articleId);
        bumpArticleListCacheVersion();
        long likeCount = article.getLikeCount();
        return new ReactionResponse(likeCount, article.getBookmarkCount());
    }

    private void invalidateArticleDetailCache(Long articleId) {
        cacheService.delete(ARTICLE_DETAIL_CACHE_PREFIX + articleId);
    }

    private void bumpArticleListCacheVersion() {
        cacheService.increment(ARTICLE_LIST_CACHE_VERSION_KEY);
    }

    private Article getAccessibleArticle(Long articleId, User user) {
        Article article = articleRepository.findByIdAndIsDeletedFalse(articleId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Article not found"));
        if (!article.isPublic() && !article.getAuthor().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return article;
    }

    private User getCurrentUser(UserPrincipal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return userRepository.findById(principal.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}
