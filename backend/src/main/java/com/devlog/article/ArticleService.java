package com.devlog.article;

import com.devlog.article.dto.ArticleCreateRequest;
import com.devlog.article.dto.ArticleResponse;
import com.devlog.article.dto.ArticleSummaryResponse;
import com.devlog.article.dto.ArticleUpdateRequest;
import com.devlog.article.dto.ArticleVisibilityRequest;
import com.devlog.cache.CacheService;
import com.devlog.common.ImageValidator;
import com.devlog.common.PageResponse;
import com.devlog.domain.Article;
import com.devlog.domain.Tag;
import com.devlog.domain.User;
import com.devlog.repository.ArticleRepository;
import com.devlog.repository.BookmarkRepository;
import com.devlog.repository.LikeRepository;
import com.devlog.repository.UserRepository;
import com.devlog.security.UserPrincipal;
import com.devlog.tag.TagService;
import com.devlog.view.ViewHistoryService;
import com.fasterxml.jackson.core.type.TypeReference;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.time.Duration;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ArticleService {
    private static final Duration ARTICLE_DETAIL_CACHE_TTL = Duration.ofSeconds(10);
    private static final Duration ARTICLE_LIST_CACHE_TTL = Duration.ofSeconds(20);
    private static final String ARTICLE_DETAIL_CACHE_PREFIX = "cache:article:detail:";
    private static final String ARTICLE_LIST_CACHE_PREFIX = "cache:articles:list:";
    private static final String ARTICLE_LIST_CACHE_VERSION_KEY = "cache:articles:list:version";

    private final ArticleRepository articleRepository;
    private final LikeRepository likeRepository;
    private final BookmarkRepository bookmarkRepository;
    private final UserRepository userRepository;
    private final TagService tagService;
    private final ViewHistoryService viewHistoryService;
    private final CacheService cacheService;

    @Transactional
    public ArticleResponse createArticle(UserPrincipal principal, ArticleCreateRequest request) {
        User author = getCurrentUser(principal);
        Article article = new Article();
        article.setAuthor(author);
        applyRequest(article, request);
        Article saved = articleRepository.save(article);
        bumpArticleListCacheVersion();
        return ArticleMapper.toResponse(saved, 0, false, false);
    }

    @Transactional
    public void updateArticle(Long articleId, UserPrincipal principal, ArticleUpdateRequest request) {
        Article article = getArticleForOwner(articleId, principal);
        applyRequest(article, request);
        invalidateArticleDetailCache(articleId);
        bumpArticleListCacheVersion();
    }

    @Transactional
    public void deleteArticle(Long articleId, UserPrincipal principal) {
        Article article = getArticleForOwner(articleId, principal);
        article.setDeleted(true);
        invalidateArticleDetailCache(articleId);
        bumpArticleListCacheVersion();
    }

    @Transactional
    public void updateVisibility(Long articleId, UserPrincipal principal, ArticleVisibilityRequest request) {
        Article article = getArticleForOwner(articleId, principal);
        article.setPublic(request.isPublic());
        invalidateArticleDetailCache(articleId);
        bumpArticleListCacheVersion();
    }

    @Transactional
    public ArticleResponse getArticleDetail(Long articleId, UserPrincipal principal) {
        if (principal == null) {
            ArticleResponse cached = cacheService.read(articleDetailCacheKey(articleId), ArticleResponse.class);
            if (cached != null) {
                maybeIncrementViewCount(articleId, null);
                return cached;
            }
        }

        Article article = articleRepository.findByIdAndIsDeletedFalse(articleId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Article not found"));
        if (!article.isPublic() && !isOwner(principal, article)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Article not found");
        }
        Long viewerId = principal == null ? null : principal.getId();
        long updatedViewCount = article.getViewCount();
        if (maybeIncrementViewCount(articleId, viewerId)) {
            updatedViewCount += 1;
        }
        if (principal != null) {
            viewHistoryService.recordView(principal.getId(), articleId);
        }
        long bookmarkCount = article.getBookmarkCount();
        boolean likedByMe = principal != null
            && likeRepository.existsByArticleIdAndUserId(article.getId(), principal.getId());
        boolean bookmarkedByMe = principal != null
            && bookmarkRepository.existsByArticleIdAndUserId(article.getId(), principal.getId());
        ArticleResponse response = ArticleMapper.toResponse(
            article,
            bookmarkCount,
            likedByMe,
            bookmarkedByMe,
            updatedViewCount
        );
        if (principal == null) {
            cacheService.write(articleDetailCacheKey(articleId), response, ARTICLE_DETAIL_CACHE_TTL);
        }
        return response;
    }

    @Transactional(readOnly = true)
    public PageResponse<ArticleSummaryResponse> listArticles(
        UserPrincipal principal,
        String tag,
        String query,
        String sort,
        int page,
        int size
    ) {
        String cacheKey = null;
        if (principal == null) {
            cacheKey = articleListCacheKey(tag, query, sort, page, size);
            PageResponse<ArticleSummaryResponse> cached = cacheService.read(
                cacheKey,
                new TypeReference<PageResponse<ArticleSummaryResponse>>() {}
            );
            if (cached != null) {
                return cached;
            }
        }

        Page<Article> result;
        if (query != null && !query.isBlank()) {
            PageRequest pageable = PageRequest.of(toZeroBasedPage(page), size, resolveSearchSort(sort));
            result = articleRepository.searchPublic(query.trim(), pageable);
        } else if (tag != null && !tag.isBlank()) {
            PageRequest pageable = PageRequest.of(toZeroBasedPage(page), size, resolveSort(sort));
            result = articleRepository.findPublicByTagName(tag.trim().toLowerCase(Locale.ROOT), pageable);
        } else {
            PageRequest pageable = PageRequest.of(toZeroBasedPage(page), size, resolveSort(sort));
            result = articleRepository.findByIsDeletedFalseAndIsPublicTrue(pageable);
        }
        PageResponse<ArticleSummaryResponse> response = buildSummaryResponse(result, principal);
        if (cacheKey != null) {
            cacheService.write(cacheKey, response, ARTICLE_LIST_CACHE_TTL);
        }
        return response;
    }

    @Transactional(readOnly = true)
    public PageResponse<ArticleSummaryResponse> listUserArticles(
        Long userId,
        UserPrincipal principal,
        String sort,
        int page,
        int size
    ) {
        PageRequest pageable = PageRequest.of(toZeroBasedPage(page), size, resolveSort(sort));
        Page<Article> result;
        if (principal != null && principal.getId().equals(userId)) {
            result = articleRepository.findByAuthorIdAndIsDeletedFalse(userId, pageable);
        } else {
            result = articleRepository.findByAuthorIdAndIsDeletedFalseAndIsPublicTrue(userId, pageable);
        }
        return buildSummaryResponse(result, principal);
    }

    @Transactional(readOnly = true)
    public PageResponse<ArticleSummaryResponse> listLikedArticles(
        Long userId,
        UserPrincipal principal,
        int page,
        int size
    ) {
        PageRequest pageable = PageRequest.of(toZeroBasedPage(page), size);
        List<Long> likedIds = likeRepository.findLikedArticleIds(userId, pageable);
        long totalElements = likeRepository.countLikedArticles(userId);
        List<Article> articles = mapToOrderedArticles(likedIds);
        return buildSummaryResponse(articles, totalElements, page, size, principal);
    }

    @Transactional(readOnly = true)
    public PageResponse<ArticleSummaryResponse> listBookmarkedArticles(
        Long userId,
        UserPrincipal principal,
        int page,
        int size
    ) {
        if (principal == null || !principal.getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        PageRequest pageable = PageRequest.of(toZeroBasedPage(page), size);
        List<Long> bookmarkedIds = bookmarkRepository.findBookmarkedArticleIds(userId, pageable);
        long totalElements = bookmarkRepository.countBookmarkedArticles(userId);
        List<Article> articles = mapToOrderedArticles(bookmarkedIds);
        return buildSummaryResponse(articles, totalElements, page, size, principal);
    }

    @Transactional(readOnly = true)
    public PageResponse<ArticleSummaryResponse> listViewedArticles(
        Long userId,
        UserPrincipal principal,
        int page,
        int size
    ) {
        if (principal == null || !principal.getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        List<Long> viewedIds = viewHistoryService.listViewedArticleIds(userId, page, size);
        Map<Long, Article> articleMap = fetchArticleMap(viewedIds);
        List<Article> visibleArticles = new ArrayList<>();
        List<Long> staleIds = new ArrayList<>();

        for (Long id : viewedIds) {
            Article article = articleMap.get(id);
            if (article == null || article.isDeleted()) {
                staleIds.add(id);
                continue;
            }
            if (!article.isPublic() && !isOwner(principal, article)) {
                staleIds.add(id);
                continue;
            }
            visibleArticles.add(article);
        }

        if (!staleIds.isEmpty()) {
            viewHistoryService.removeViews(userId, staleIds);
        }
        long totalElements = viewHistoryService.countViewedArticles(userId);
        return buildSummaryResponse(visibleArticles, totalElements, page, size, principal);
    }

    @Transactional
    public void updateThumbnail(Long articleId, UserPrincipal principal, MultipartFile file) {
        Article article = getArticleForOwner(articleId, principal);
        ImageValidator.validateImage(file);
        try {
            article.setThumbnail(file.getBytes());
            article.setThumbnailType(ImageValidator.normalizeContentType(file.getContentType()));
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Failed to read image file");
        }
        invalidateArticleDetailCache(articleId);
        bumpArticleListCacheVersion();
    }

    public ImagePayload getThumbnail(Long articleId, UserPrincipal principal) {
        Article article = articleRepository.findByIdAndIsDeletedFalse(articleId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Article not found"));
        if (!article.isPublic() && !isOwner(principal, article)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Article not found");
        }
        if (article.getThumbnail() == null || article.getThumbnail().length == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Thumbnail not found");
        }
        return new ImagePayload(article.getThumbnail(), article.getThumbnailType());
    }

    private void applyRequest(Article article, ArticleCreateRequest request) {
        article.setTitle(request.title());
        article.setContent(request.content());
        article.setSummary(request.summary());
        article.setPublic(request.isPublic() == null || request.isPublic());
        article.setCategory(request.category());
        article.setLevel(request.level());
        List<Tag> tags = tagService.resolveTags(request.tags());
        article.setTags(tags == null ? new HashSet<>() : new HashSet<>(tags));
    }

    private void applyRequest(Article article, ArticleUpdateRequest request) {
        article.setTitle(request.title());
        article.setContent(request.content());
        article.setSummary(request.summary());
        if (request.isPublic() != null) {
            article.setPublic(request.isPublic());
        }
        article.setCategory(request.category());
        article.setLevel(request.level());
        List<Tag> tags = tagService.resolveTags(request.tags());
        article.setTags(tags == null ? new HashSet<>() : new HashSet<>(tags));
    }

    private Article getArticleForOwner(Long articleId, UserPrincipal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        Article article = articleRepository.findByIdAndIsDeletedFalse(articleId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Article not found"));
        if (!isOwner(principal, article)) {
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

    private boolean isOwner(UserPrincipal principal, Article article) {
        return principal != null && principal.getId().equals(article.getAuthor().getId());
    }

    private Sort resolveSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Direction.DESC, "createdAt");
        }
        return switch (sort.toLowerCase(Locale.ROOT)) {
            case "views" -> Sort.by(Sort.Direction.DESC, "viewCount");
            case "likes" -> Sort.by(Sort.Direction.DESC, "likeCount");
            case "latest" -> Sort.by(Sort.Direction.DESC, "createdAt");
            default -> Sort.by(Sort.Direction.DESC, "createdAt");
        };
    }

    private Sort resolveSearchSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Direction.DESC, "created_at");
        }
        return switch (sort.toLowerCase(Locale.ROOT)) {
            case "views" -> Sort.by(Sort.Direction.DESC, "view_count");
            case "likes" -> Sort.by(Sort.Direction.DESC, "like_count");
            case "latest" -> Sort.by(Sort.Direction.DESC, "created_at");
            default -> Sort.by(Sort.Direction.DESC, "created_at");
        };
    }

    private PageResponse<ArticleSummaryResponse> buildSummaryResponse(
        Page<Article> result,
        UserPrincipal principal
    ) {
        return buildSummaryResponse(
            result.getContent(),
            result.getTotalElements(),
            result.getNumber() + 1,
            result.getSize(),
            principal
        );
    }

    private PageResponse<ArticleSummaryResponse> buildSummaryResponse(
        List<Article> articles,
        long totalElements,
        int page,
        int size,
        UserPrincipal principal
    ) {
        Long userId = principal == null ? null : principal.getId();
        Set<Long> likedIds = Collections.emptySet();
        Set<Long> bookmarkedIds = Collections.emptySet();

        if (userId != null && !articles.isEmpty()) {
            List<Long> articleIds = articles.stream().map(Article::getId).toList();
            likedIds = new HashSet<>(likeRepository.findArticleIdsByUserIdAndArticleIdIn(userId, articleIds));
            bookmarkedIds = new HashSet<>(
                bookmarkRepository.findArticleIdsByUserIdAndArticleIdIn(userId, articleIds)
            );
        }

        Set<Long> finalLikedIds = likedIds;
        Set<Long> finalBookmarkedIds = bookmarkedIds;
        List<ArticleSummaryResponse> items = articles.stream()
            .map(article -> ArticleMapper.toSummary(
                article,
                article.getBookmarkCount(),
                finalLikedIds.contains(article.getId()),
                finalBookmarkedIds.contains(article.getId())
            ))
            .toList();
        int totalPages = size == 0 ? 0 : (int) Math.ceil((double) totalElements / size);
        return new PageResponse<>(items, page, size, totalElements, totalPages);
    }

    private int toZeroBasedPage(int page) {
        return Math.max(page, 1) - 1;
    }

    private Map<Long, Article> fetchArticleMap(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Collections.emptyMap();
        }
        return articleRepository.findByIdIn(ids).stream()
            .collect(Collectors.toMap(Article::getId, article -> article));
    }

    private List<Article> mapToOrderedArticles(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Collections.emptyList();
        }
        Map<Long, Article> articleMap = fetchArticleMap(ids);
        return ids.stream()
            .map(articleMap::get)
            .filter(article -> article != null && !article.isDeleted())
            .toList();
    }

    private boolean maybeIncrementViewCount(Long articleId, Long userId) {
        if (!viewHistoryService.shouldIncrementArticleView(articleId, userId)) {
            return false;
        }
        articleRepository.incrementViewCount(articleId);
        return true;
    }

    private String articleDetailCacheKey(Long articleId) {
        return ARTICLE_DETAIL_CACHE_PREFIX + articleId;
    }

    private void invalidateArticleDetailCache(Long articleId) {
        cacheService.delete(articleDetailCacheKey(articleId));
    }

    private String articleListCacheKey(String tag, String query, String sort, int page, int size) {
        String version = cacheService.readString(ARTICLE_LIST_CACHE_VERSION_KEY);
        if (version == null || version.isBlank()) {
            version = "0";
        }
        return ARTICLE_LIST_CACHE_PREFIX
            + version
            + ":t=" + normalizeCachePart(tag)
            + ":q=" + normalizeCachePart(query)
            + ":s=" + normalizeCachePart(sort)
            + ":p=" + page
            + ":z=" + size;
    }

    private String normalizeCachePart(String value) {
        if (value == null || value.isBlank()) {
            return "-";
        }
        return value.trim().toLowerCase(Locale.ROOT).replace(":", "%3A");
    }

    private void bumpArticleListCacheVersion() {
        cacheService.increment(ARTICLE_LIST_CACHE_VERSION_KEY);
    }

    public record ImagePayload(byte[] data, String contentType) {
    }
}
