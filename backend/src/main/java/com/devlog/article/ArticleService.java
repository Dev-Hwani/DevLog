package com.devlog.article;

import com.devlog.article.dto.ArticleCreateRequest;
import com.devlog.article.dto.ArticleResponse;
import com.devlog.article.dto.ArticleSummaryResponse;
import com.devlog.article.dto.ArticleUpdateRequest;
import com.devlog.article.dto.ArticleVisibilityRequest;
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
import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Set;
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
    private final ArticleRepository articleRepository;
    private final LikeRepository likeRepository;
    private final BookmarkRepository bookmarkRepository;
    private final UserRepository userRepository;
    private final TagService tagService;

    @Transactional
    public ArticleResponse createArticle(UserPrincipal principal, ArticleCreateRequest request) {
        User author = getCurrentUser(principal);
        Article article = new Article();
        article.setAuthor(author);
        applyRequest(article, request);
        Article saved = articleRepository.save(article);
        return ArticleMapper.toResponse(saved, 0, false, false);
    }

    @Transactional
    public ArticleResponse updateArticle(Long articleId, UserPrincipal principal, ArticleUpdateRequest request) {
        Article article = getArticleForOwner(articleId, principal);
        applyRequest(article, request);
        long bookmarkCount = article.getBookmarkCount();
        boolean likedByMe = likeRepository.existsByArticleIdAndUserId(article.getId(), principal.getId());
        boolean bookmarkedByMe =
            bookmarkRepository.existsByArticleIdAndUserId(article.getId(), principal.getId());
        return ArticleMapper.toResponse(article, bookmarkCount, likedByMe, bookmarkedByMe);
    }

    @Transactional
    public void deleteArticle(Long articleId, UserPrincipal principal) {
        Article article = getArticleForOwner(articleId, principal);
        article.setDeleted(true);
    }

    @Transactional
    public void updateVisibility(Long articleId, UserPrincipal principal, ArticleVisibilityRequest request) {
        Article article = getArticleForOwner(articleId, principal);
        article.setPublic(request.isPublic());
    }

    @Transactional
    public ArticleResponse getArticleDetail(Long articleId, UserPrincipal principal) {
        Article article = articleRepository.findByIdAndIsDeletedFalse(articleId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Article not found"));
        if (!article.isPublic() && !isOwner(principal, article)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Article not found");
        }
        articleRepository.incrementViewCount(articleId);
        article.setViewCount(article.getViewCount() + 1);
        long bookmarkCount = article.getBookmarkCount();
        boolean likedByMe = principal != null
            && likeRepository.existsByArticleIdAndUserId(article.getId(), principal.getId());
        boolean bookmarkedByMe = principal != null
            && bookmarkRepository.existsByArticleIdAndUserId(article.getId(), principal.getId());
        return ArticleMapper.toResponse(article, bookmarkCount, likedByMe, bookmarkedByMe);
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
        PageRequest pageable = PageRequest.of(page, size, resolveSort(sort));
        Page<Article> result;
        if (query != null && !query.isBlank()) {
            result = articleRepository.searchPublic(query.trim(), pageable);
        } else if (tag != null && !tag.isBlank()) {
            result = articleRepository.findPublicByTagName(tag.trim().toLowerCase(Locale.ROOT), pageable);
        } else {
            result = articleRepository.findByIsDeletedFalseAndIsPublicTrue(pageable);
        }
        return buildSummaryResponse(result, principal);
    }

    @Transactional(readOnly = true)
    public PageResponse<ArticleSummaryResponse> listUserArticles(
        Long userId,
        UserPrincipal principal,
        String sort,
        int page,
        int size
    ) {
        PageRequest pageable = PageRequest.of(page, size, resolveSort(sort));
        Page<Article> result;
        if (principal != null && principal.getId().equals(userId)) {
            result = articleRepository.findByAuthorIdAndIsDeletedFalse(userId, pageable);
        } else {
            result = articleRepository.findByAuthorIdAndIsDeletedFalseAndIsPublicTrue(userId, pageable);
        }
        return buildSummaryResponse(result, principal);
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
            default -> Sort.by(Sort.Direction.DESC, "createdAt");
        };
    }

    private PageResponse<ArticleSummaryResponse> buildSummaryResponse(
        Page<Article> result,
        UserPrincipal principal
    ) {
        List<Article> articles = result.getContent();
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

        List<ArticleSummaryResponse> items = articles.stream()
            .map(article -> ArticleMapper.toSummary(
                article,
                article.getBookmarkCount(),
                likedIds.contains(article.getId()),
                bookmarkedIds.contains(article.getId())
            ))
            .toList();
        return new PageResponse<>(
            items,
            result.getNumber(),
            result.getSize(),
            result.getTotalElements(),
            result.getTotalPages()
        );
    }

    public record ImagePayload(byte[] data, String contentType) {
    }
}
