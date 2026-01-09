package com.devlog.search;

import com.devlog.article.ArticleService;
import com.devlog.article.dto.ArticleSummaryResponse;
import com.devlog.common.PageResponse;
import com.devlog.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {
    private final ArticleService articleService;

    @GetMapping
    public ResponseEntity<PageResponse<ArticleSummaryResponse>> search(
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestParam String query,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "10") int size,
        @RequestParam(required = false) String sort
    ) {
        if (query == null || query.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Query is required");
        }
        return ResponseEntity.ok(articleService.listArticles(principal, null, query, sort, page, size));
    }
}
