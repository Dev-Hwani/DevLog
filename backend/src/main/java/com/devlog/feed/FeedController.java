package com.devlog.feed;

import com.devlog.article.dto.ArticleSummaryResponse;
import com.devlog.common.CursorResponse;
import com.devlog.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/feed")
@RequiredArgsConstructor
public class FeedController {
    private final FeedService feedService;

    @GetMapping
    public ResponseEntity<CursorResponse<ArticleSummaryResponse>> followingFeed(
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestParam(required = false) String cursor,
        @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(feedService.followingFeed(principal, cursor, size));
    }

    @GetMapping("/trending")
    public ResponseEntity<CursorResponse<ArticleSummaryResponse>> trendingFeed(
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestParam(defaultValue = "24h") String range,
        @RequestParam(required = false) String cursor,
        @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(feedService.trendingFeed(principal, range, cursor, size));
    }
}
