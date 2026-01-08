package com.devlog.security;

import com.devlog.auth.AuthResult;
import com.devlog.auth.AuthService;
import com.devlog.config.AppProperties;
import com.devlog.domain.enums.AuthProvider;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {
    private final AuthService authService;
    private final CookieUtil cookieUtil;
    private final AppProperties appProperties;

    @Override
    public void onAuthenticationSuccess(
        HttpServletRequest request,
        HttpServletResponse response,
        Authentication authentication
    ) throws IOException, ServletException {
        OAuth2AuthenticationToken authToken = (OAuth2AuthenticationToken) authentication;
        AuthProvider provider = AuthProvider.valueOf(authToken.getAuthorizedClientRegistrationId().toUpperCase());
        OAuth2User oAuth2User = authToken.getPrincipal();
        Map<String, Object> attributes = oAuth2User.getAttributes();

        AuthResult result = authService.handleOAuthLogin(provider, attributes);
        response.addHeader(HttpHeaders.SET_COOKIE, cookieUtil.createAccessCookie(result.tokens().accessToken()).toString());
        response.addHeader(HttpHeaders.SET_COOKIE, cookieUtil.createRefreshCookie(result.tokens().refreshToken()).toString());

        getRedirectStrategy().sendRedirect(request, response, appProperties.getFrontendUrl());
    }
}
