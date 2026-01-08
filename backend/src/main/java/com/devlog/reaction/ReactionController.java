package com.devlog.reaction;

import com.devlog.reaction.dto.ReactionResponse;
import com.devlog.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/articles")
@RequiredArgsConstructor
public class ReactionController {
    private final ReactionService reactionService;

    @PostMapping("/{id}/like")
    public ResponseEntity<ReactionResponse> like(
        @PathVariable Long id,
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(reactionService.likeArticle(id, principal));
    }

    @DeleteMapping("/{id}/like")
    public ResponseEntity<ReactionResponse> unlike(
        @PathVariable Long id,
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(reactionService.unlikeArticle(id, principal));
    }

    @PostMapping("/{id}/bookmark")
    public ResponseEntity<ReactionResponse> bookmark(
        @PathVariable Long id,
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(reactionService.bookmarkArticle(id, principal));
    }

    @DeleteMapping("/{id}/bookmark")
    public ResponseEntity<ReactionResponse> unbookmark(
        @PathVariable Long id,
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(reactionService.unbookmarkArticle(id, principal));
    }
}
