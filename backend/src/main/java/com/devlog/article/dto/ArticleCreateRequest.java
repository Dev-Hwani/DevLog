package com.devlog.article.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public record ArticleCreateRequest(
    @NotBlank @Size(max = 255) String title,
    @NotBlank String content,
    @Size(max = 1000) String summary,
    Boolean isPublic,
    List<String> tags,
    @Size(max = 50) String category,
    @Size(max = 50) String level
) {
}
