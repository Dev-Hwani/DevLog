package com.devlog.security;

import com.devlog.config.AppProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Arrays;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CookieUtil {
    private final AppProperties appProperties;

    public ResponseCookie createAccessCookie(String token) {
        AppProperties.Cookie cookie = appProperties.getJwt().getCookie();
        return ResponseCookie.from(cookie.getAccessName(), token)
            .httpOnly(true)
            .secure(cookie.isSecure())
            .path("/")
            .sameSite(cookie.getSameSite())
            .build();
    }

    public ResponseCookie createRefreshCookie(String token) {
        AppProperties.Cookie cookie = appProperties.getJwt().getCookie();
        return ResponseCookie.from(cookie.getRefreshName(), token)
            .httpOnly(true)
            .secure(cookie.isSecure())
            .path("/")
            .sameSite(cookie.getSameSite())
            .build();
    }

    public ResponseCookie clearAccessCookie() {
        AppProperties.Cookie cookie = appProperties.getJwt().getCookie();
        return ResponseCookie.from(cookie.getAccessName(), "")
            .httpOnly(true)
            .secure(cookie.isSecure())
            .path("/")
            .sameSite(cookie.getSameSite())
            .maxAge(0)
            .build();
    }

    public ResponseCookie clearRefreshCookie() {
        AppProperties.Cookie cookie = appProperties.getJwt().getCookie();
        return ResponseCookie.from(cookie.getRefreshName(), "")
            .httpOnly(true)
            .secure(cookie.isSecure())
            .path("/")
            .sameSite(cookie.getSameSite())
            .maxAge(0)
            .build();
    }

    public Optional<String> resolveAccessToken(HttpServletRequest request) {
        String name = appProperties.getJwt().getCookie().getAccessName();
        return getCookieValue(request, name);
    }

    public Optional<String> resolveRefreshToken(HttpServletRequest request) {
        String name = appProperties.getJwt().getCookie().getRefreshName();
        return getCookieValue(request, name);
    }

    private Optional<String> getCookieValue(HttpServletRequest request, String cookieName) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return Optional.empty();
        }
        return Arrays.stream(cookies)
            .filter(cookie -> cookieName.equals(cookie.getName()))
            .map(Cookie::getValue)
            .findFirst();
    }
}
