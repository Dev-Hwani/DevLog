package com.devlog.follow;

import com.devlog.common.PageResponse;
import com.devlog.follow.dto.FollowResponse;
import com.devlog.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class FollowController {
    private final FollowService followService;

    @PostMapping("/{id}/follow")
    public ResponseEntity<Void> follow(
        @PathVariable Long id,
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        followService.followUser(id, principal);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/follow")
    public ResponseEntity<Void> unfollow(
        @PathVariable Long id,
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        followService.unfollowUser(id, principal);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/followers")
    public ResponseEntity<PageResponse<FollowResponse>> followers(
        @PathVariable Long id,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(followService.listFollowers(id, page, size));
    }

    @GetMapping("/{id}/following")
    public ResponseEntity<PageResponse<FollowResponse>> following(
        @PathVariable Long id,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(followService.listFollowing(id, page, size));
    }
}
