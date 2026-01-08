package com.devlog.tag;

import com.devlog.domain.Tag;
import com.devlog.repository.TagRepository;
import com.devlog.tag.dto.TagResponse;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TagService {
    private final TagRepository tagRepository;

    public List<Tag> resolveTags(List<String> tags) {
        if (tags == null || tags.isEmpty()) {
            return Collections.emptyList();
        }
        List<Tag> results = new ArrayList<>();
        for (String tagName : tags) {
            if (tagName == null) {
                continue;
            }
            String normalized = tagName.trim().toLowerCase(Locale.ROOT);
            if (normalized.isEmpty()) {
                continue;
            }
            Tag tag = tagRepository.findByName(normalized).orElseGet(() -> {
                Tag created = new Tag();
                created.setName(normalized);
                return tagRepository.save(created);
            });
            results.add(tag);
        }
        return results;
    }

    public List<TagResponse> listTags() {
        return tagRepository.findTagCounts().stream()
            .map(row -> new TagResponse(row.getName(), row.getCount()))
            .toList();
    }
}
