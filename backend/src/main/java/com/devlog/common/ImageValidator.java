package com.devlog.common;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;

public class ImageValidator {
    private static final long MAX_SIZE = 10 * 1024 * 1024;

    private ImageValidator() {
    }

    public static void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image file is required");
        }
        if (file.getSize() > MAX_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image size exceeds 10MB limit");
        }
        String contentType = file.getContentType();
        if (!isAllowed(contentType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only JPG and PNG images are allowed");
        }
    }

    public static String normalizeContentType(String contentType) {
        if ("image/jpg".equalsIgnoreCase(contentType)) {
            return "image/jpeg";
        }
        return contentType;
    }

    public static String resolveResponseContentType(String storedType) {
        if (storedType == null || storedType.isBlank()) {
            return "application/octet-stream";
        }
        return storedType;
    }

    private static boolean isAllowed(String contentType) {
        if (contentType == null) {
            return false;
        }
        return "image/jpeg".equalsIgnoreCase(contentType)
            || "image/jpg".equalsIgnoreCase(contentType)
            || "image/png".equalsIgnoreCase(contentType);
    }
}
