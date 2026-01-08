package com.devlog.common;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public class CursorUtil {
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    public static String encodeTimeCursor(LocalDateTime time, Long id) {
        if (time == null || id == null) {
            return null;
        }
        String raw = time.format(FORMATTER) + "|" + id;
        return Base64.getUrlEncoder().withoutPadding().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    public static TimeCursor decodeTimeCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return null;
        }
        String decoded = decode(cursor);
        String[] parts = decoded.split("\\|");
        if (parts.length != 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid cursor");
        }
        LocalDateTime time = LocalDateTime.parse(parts[0], FORMATTER);
        Long id = parseLong(parts[1]);
        return new TimeCursor(time, id);
    }

    public static String encodeTrendCursor(long viewCount, long likeCount, long id) {
        String raw = viewCount + "|" + likeCount + "|" + id;
        return Base64.getUrlEncoder().withoutPadding().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    public static TrendCursor decodeTrendCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return null;
        }
        String decoded = decode(cursor);
        String[] parts = decoded.split("\\|");
        if (parts.length != 3) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid cursor");
        }
        long view = parseLong(parts[0]);
        long like = parseLong(parts[1]);
        long id = parseLong(parts[2]);
        return new TrendCursor(view, like, id);
    }

    private static String decode(String cursor) {
        try {
            return new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid cursor");
        }
    }

    private static Long parseLong(String value) {
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid cursor");
        }
    }

    public record TimeCursor(LocalDateTime time, Long id) {
    }

    public record TrendCursor(long viewCount, long likeCount, long id) {
    }
}
