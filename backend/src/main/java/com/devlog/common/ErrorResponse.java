package com.devlog.common;

import java.util.List;

public record ErrorResponse(String message, String code, List<FieldError> errors) {
    public static ErrorResponse of(String message, String code, List<FieldError> errors) {
        return new ErrorResponse(message, code, errors);
    }

    public record FieldError(String field, String message) {
    }
}
