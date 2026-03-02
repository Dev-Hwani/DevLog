package com.devlog.security;

import com.devlog.common.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {
    private static final boolean RATE_LIMIT_ENABLED = false;
    private static final int AUTH_LIMIT = 1000;
    private static final int GENERAL_LIMIT = 1000;
    private static final Duration WINDOW = Duration.ofMinutes(1);

    private final ObjectMapper objectMapper;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!RATE_LIMIT_ENABLED) {
            return true;
        }
        String path = request.getRequestURI();
        return path == null || !path.startsWith("/api");
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String path = request.getRequestURI();
        boolean isAuth = path != null && path.startsWith("/api/auth");
        String key = resolveClientKey(request, isAuth);
        Bucket bucket = buckets.computeIfAbsent(key, unused -> newBucket(isAuth));

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        response.setHeader("X-Rate-Limit-Remaining", String.valueOf(probe.getRemainingTokens()));

        if (probe.isConsumed()) {
            filterChain.doFilter(request, response);
            return;
        }

        long waitSeconds = Duration.ofNanos(probe.getNanosToWaitForRefill()).toSeconds();
        response.setHeader("Retry-After", String.valueOf(waitSeconds));
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        ErrorResponse error = ErrorResponse.of("Too many requests", "TOO_MANY_REQUESTS", List.of());
        response.getWriter().write(objectMapper.writeValueAsString(error));
    }

    private Bucket newBucket(boolean isAuth) {
        int limit = isAuth ? AUTH_LIMIT : GENERAL_LIMIT;
        Bandwidth bandwidth = Bandwidth.classic(limit, Refill.greedy(limit, WINDOW));
        return Bucket.builder().addLimit(bandwidth).build();
    }

    private String resolveClientKey(HttpServletRequest request, boolean isAuth) {
        String forwarded = request.getHeader("X-Forwarded-For");
        String ip = forwarded == null || forwarded.isBlank()
            ? request.getRemoteAddr()
            : forwarded.split(",")[0].trim();
        return ip + (isAuth ? ":auth" : ":api");
    }
}
