package com.devlog.auth;

import com.devlog.auth.dto.AuthResponse;
import com.devlog.auth.dto.LoginRequest;
import com.devlog.auth.dto.SignupRequest;
import com.devlog.security.CookieUtil;
import com.devlog.security.TokenPair;
import com.devlog.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;
    private final CookieUtil cookieUtil;

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(
        @Valid @RequestBody SignupRequest request,
        HttpServletResponse response
    ) {
        AuthResult result = authService.signup(request);
        applyCookies(response, result.tokens());
        return ResponseEntity.created(URI.create("/api/users/" + result.response().id()))
            .body(result.response());
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
        @Valid @RequestBody LoginRequest request,
        HttpServletResponse response
    ) {
        AuthResult result = authService.login(request);
        applyCookies(response, result.tokens());
        return ResponseEntity.ok(result.response());
    }

    @PostMapping("/refresh")
    public ResponseEntity<Void> refresh(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = cookieUtil.resolveRefreshToken(request).orElse(null);
        TokenPair tokens = authService.refresh(refreshToken);
        applyCookies(response, tokens);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = cookieUtil.resolveRefreshToken(request).orElse(null);
        authService.logout(refreshToken);
        clearCookies(response);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> me(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.noContent().build();
        }
        AuthResponse response = new AuthResponse(
            principal.getId(),
            principal.getUsername(),
            principal.getNickname(),
            principal.getRole()
        );
        return ResponseEntity.ok(response);
    }

    private void applyCookies(HttpServletResponse response, TokenPair tokens) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookieUtil.createAccessCookie(tokens.accessToken()).toString());
        response.addHeader(HttpHeaders.SET_COOKIE, cookieUtil.createRefreshCookie(tokens.refreshToken()).toString());
    }

    private void clearCookies(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookieUtil.clearAccessCookie().toString());
        response.addHeader(HttpHeaders.SET_COOKIE, cookieUtil.clearRefreshCookie().toString());
    }
}
