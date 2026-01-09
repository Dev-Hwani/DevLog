package com.devlog.comment;

import com.devlog.comment.dto.CommentCreateRequest;
import com.devlog.comment.dto.CommentResponse;
import com.devlog.comment.dto.CommentUpdateRequest;
import com.devlog.security.UserPrincipal;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CommentController {
    private final CommentService commentService;

    @GetMapping("/articles/{id}/comments")
    public ResponseEntity<List<CommentResponse>> list(@PathVariable Long id) {
        return ResponseEntity.ok(commentService.listComments(id));
    }

    @PostMapping("/articles/{id}/comments")
    public ResponseEntity<CommentResponse> create(
        @PathVariable Long id,
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody CommentCreateRequest request
    ) {
        CommentResponse response = commentService.createComment(id, principal, request);
        return ResponseEntity.created(URI.create("/api/comments/" + response.id())).body(response);
    }

    @PutMapping("/comments/{id}")
    public ResponseEntity<Void> update(
        @PathVariable Long id,
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody CommentUpdateRequest request
    ) {
        commentService.updateComment(id, principal, request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/comments/{id}")
    public ResponseEntity<Void> delete(
        @PathVariable Long id,
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        commentService.deleteComment(id, principal);
        return ResponseEntity.noContent().build();
    }
}
