package com.devlog.tag;

import com.devlog.article.ArticleService;
import com.devlog.article.dto.ArticleSummaryResponse;
import com.devlog.common.PageResponse;
import com.devlog.security.UserPrincipal;
import com.devlog.tag.dto.TagResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tags")
@RequiredArgsConstructor
public class TagController {
    private final TagService tagService;
    private final ArticleService articleService;

    @GetMapping
    public ResponseEntity<List<TagResponse>> listTags() {
        return ResponseEntity.ok(tagService.listTags());
    }

    @GetMapping("/{name}/articles")
    public ResponseEntity<PageResponse<ArticleSummaryResponse>> listArticlesByTag(
        @PathVariable String name,
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "10") int size,
        @RequestParam(required = false) String sort
    ) {
        return ResponseEntity.ok(articleService.listArticles(principal, name, null, sort, page, size));
    }
}
