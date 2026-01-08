package com.devlog.user;

import com.devlog.article.ArticleService;
import com.devlog.article.dto.ArticleSummaryResponse;
import com.devlog.common.ImageValidator;
import com.devlog.common.PageResponse;
import com.devlog.security.UserPrincipal;
import com.devlog.user.dto.UserProfileResponse;
import com.devlog.user.dto.UserUpdateRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;
    private final ArticleService articleService;

    @GetMapping("/{id}")
    public ResponseEntity<UserProfileResponse> profile(
        @PathVariable Long id,
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(userService.getProfile(id, principal));
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> me(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(userService.getMe(principal));
    }

    @PutMapping("/me")
    public ResponseEntity<UserProfileResponse> update(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody UserUpdateRequest request
    ) {
        return ResponseEntity.ok(userService.updateProfile(principal, request));
    }

    @PostMapping("/me/profile-image")
    public ResponseEntity<Void> updateProfileImage(
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestParam("file") MultipartFile file
    ) {
        userService.updateProfileImage(principal, file);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/profile-image")
    public ResponseEntity<byte[]> getProfileImage(@PathVariable Long id) {
        UserService.ImagePayload payload = userService.getProfileImage(id);
        String contentType = ImageValidator.resolveResponseContentType(payload.contentType());
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_TYPE, contentType)
            .body(payload.data());
    }

    @GetMapping("/{id}/articles")
    public ResponseEntity<PageResponse<ArticleSummaryResponse>> userArticles(
        @PathVariable Long id,
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size,
        @RequestParam(required = false) String sort
    ) {
        return ResponseEntity.ok(articleService.listUserArticles(id, principal, sort, page, size));
    }
}
