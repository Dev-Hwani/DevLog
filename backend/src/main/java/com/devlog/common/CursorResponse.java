package com.devlog.common;

import java.util.List;

public record CursorResponse<T>(List<T> items, String nextCursor, int size) {
}
