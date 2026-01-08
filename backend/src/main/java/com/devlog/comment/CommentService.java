package com.devlog.comment;

import com.devlog.comment.dto.CommentCreateRequest;
import com.devlog.comment.dto.CommentResponse;
import com.devlog.comment.dto.CommentUpdateRequest;
import com.devlog.domain.Article;
import com.devlog.domain.Comment;
import com.devlog.domain.User;
import com.devlog.repository.ArticleRepository;
import com.devlog.repository.CommentRepository;
import com.devlog.repository.UserRepository;
import com.devlog.security.UserPrincipal;
import com.devlog.user.dto.UserSummary;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class CommentService {
    private final CommentRepository commentRepository;
    private final ArticleRepository articleRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<CommentResponse> listComments(Long articleId) {
        Article article = articleRepository.findByIdAndIsDeletedFalse(articleId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Article not found"));
        if (!article.isPublic()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Article not found");
        }
        List<Comment> comments = commentRepository.findByArticleIdWithAuthor(articleId);
        Map<Long, CommentResponse> responseMap = new HashMap<>();
        List<CommentResponse> roots = new ArrayList<>();

        for (Comment comment : comments) {
            CommentResponse response = toResponse(comment, List.of());
            responseMap.put(comment.getId(), response);
        }

        for (Comment comment : comments) {
            CommentResponse response = responseMap.get(comment.getId());
            if (comment.getParent() != null) {
                CommentResponse parent = responseMap.get(comment.getParent().getId());
                if (parent != null) {
                    parent.replies().add(response);
                }
            } else {
                roots.add(response);
            }
        }

        return roots;
    }

    @Transactional
    public CommentResponse createComment(Long articleId, UserPrincipal principal, CommentCreateRequest request) {
        User author = getCurrentUser(principal);
        Article article = articleRepository.findByIdAndIsDeletedFalse(articleId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Article not found"));
        if (!article.isPublic()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        Comment comment = new Comment();
        comment.setArticle(article);
        comment.setAuthor(author);
        comment.setContent(request.content());

        if (request.parentId() != null) {
            Comment parent = commentRepository.findById(request.parentId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Parent comment not found"));
            if (parent.getParent() != null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only one level of replies is allowed");
            }
            if (!parent.getArticle().getId().equals(articleId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parent comment must belong to the article");
            }
            comment.setParent(parent);
        }

        Comment saved = commentRepository.save(comment);
        return toResponse(saved, List.of());
    }

    @Transactional
    public CommentResponse updateComment(Long commentId, UserPrincipal principal, CommentUpdateRequest request) {
        Comment comment = getCommentForOwner(commentId, principal);
        comment.setContent(request.content());
        comment.setDeleted(false);
        return toResponse(comment, List.of());
    }

    @Transactional
    public void deleteComment(Long commentId, UserPrincipal principal) {
        Comment comment = getCommentForOwner(commentId, principal);
        comment.setDeleted(true);
    }

    private CommentResponse toResponse(Comment comment, List<CommentResponse> replies) {
        boolean deleted = comment.isDeleted();
        String content = deleted ? null : comment.getContent();
        return new CommentResponse(
            comment.getId(),
            content,
            UserSummary.from(comment.getAuthor()),
            comment.getParent() == null ? null : comment.getParent().getId(),
            deleted,
            comment.getCreatedAt(),
            new ArrayList<>(replies)
        );
    }

    private Comment getCommentForOwner(Long id, UserPrincipal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        Comment comment = commentRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found"));
        if (!principal.getId().equals(comment.getAuthor().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return comment;
    }

    private User getCurrentUser(UserPrincipal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return userRepository.findById(principal.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}
