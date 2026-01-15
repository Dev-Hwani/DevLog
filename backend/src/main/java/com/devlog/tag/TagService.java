package com.devlog.tag;

import com.devlog.cache.CacheService;
import com.devlog.domain.Tag;
import com.devlog.repository.TagRepository;
import com.devlog.tag.dto.TagResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TagService {
    private static final String TAG_CACHE_KEY = "cache:tags";
    private static final Duration TAG_CACHE_TTL = Duration.ofMinutes(5);

    private final TagRepository tagRepository;
    private final CacheService cacheService;

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
        List<TagResponse> cached = cacheService.read(TAG_CACHE_KEY, new TypeReference<List<TagResponse>>() {});
        if (cached != null) {
            return cached;
        }

        List<TagResponse> tags = tagRepository.findTagCounts().stream()
            .map(row -> new TagResponse(row.getName(), row.getCount()))
            .toList();
        cacheService.write(TAG_CACHE_KEY, tags, TAG_CACHE_TTL);
        return tags;
    }
}
