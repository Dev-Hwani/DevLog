package com.devlog.article;

import com.devlog.article.dto.ArticleCreateRequest;
import com.devlog.article.dto.ArticleResponse;
import com.devlog.article.dto.ArticleSummaryResponse;
import com.devlog.article.dto.ArticleUpdateRequest;
import com.devlog.article.dto.ArticleVisibilityRequest;
import com.devlog.common.ImageValidator;
import com.devlog.common.PageResponse;
import com.devlog.security.UserPrincipal;
import jakarta.validation.Valid;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/articles")
@RequiredArgsConstructor
public class ArticleController {
    private final ArticleService articleService;

    @PostMapping
    public ResponseEntity<ArticleResponse> create(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody ArticleCreateRequest request
    ) {
        ArticleResponse response = articleService.createArticle(principal, request);
        return ResponseEntity.created(URI.create("/api/articles/" + response.id())).body(response);
    }

    @GetMapping
    public ResponseEntity<PageResponse<ArticleSummaryResponse>> list(
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "10") int size,
        @RequestParam(required = false) String sort,
        @RequestParam(required = false) String tag,
        @RequestParam(required = false) String query
    ) {
        return ResponseEntity.ok(articleService.listArticles(principal, tag, query, sort, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ArticleResponse> detail(
        @PathVariable Long id,
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(articleService.getArticleDetail(id, principal));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Void> update(
        @PathVariable Long id,
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody ArticleUpdateRequest request
    ) {
        articleService.updateArticle(id, principal, request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
        @PathVariable Long id,
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        articleService.deleteArticle(id, principal);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/visibility")
    public ResponseEntity<Void> updateVisibility(
        @PathVariable Long id,
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody ArticleVisibilityRequest request
    ) {
        articleService.updateVisibility(id, principal, request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/thumbnail")
    public ResponseEntity<Void> uploadThumbnail(
        @PathVariable Long id,
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestParam("file") MultipartFile file
    ) {
        articleService.updateThumbnail(id, principal, file);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/thumbnail")
    public ResponseEntity<byte[]> getThumbnail(
        @PathVariable Long id,
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        ArticleService.ImagePayload payload = articleService.getThumbnail(id, principal);
        String contentType = ImageValidator.resolveResponseContentType(payload.contentType());
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_TYPE, contentType)
            .body(payload.data());
    }
}
