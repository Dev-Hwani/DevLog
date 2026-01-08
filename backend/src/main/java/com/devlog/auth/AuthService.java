package com.devlog.auth;

import com.devlog.auth.dto.AuthResponse;
import com.devlog.auth.dto.LoginRequest;
import com.devlog.auth.dto.SignupRequest;
import com.devlog.domain.OAuthAccount;
import com.devlog.domain.User;
import com.devlog.domain.enums.AuthProvider;
import com.devlog.domain.enums.UserRole;
import com.devlog.repository.OAuthAccountRepository;
import com.devlog.repository.UserRepository;
import com.devlog.security.JwtClaims;
import com.devlog.security.JwtTokenProvider;
import com.devlog.security.RefreshTokenStore;
import com.devlog.security.TokenPair;
import io.jsonwebtoken.JwtException;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AuthService {
    private static final Pattern PASSWORD_POLICY =
        Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$");

    private final UserRepository userRepository;
    private final OAuthAccountRepository oauthAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final RefreshTokenStore refreshTokenStore;

    public AuthResult signup(SignupRequest request) {
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        }
        validatePassword(request.password());

        User user = new User();
        user.setEmail(request.email());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setNickname(request.nickname());
        user.setRole(UserRole.USER);

        User saved = userRepository.save(user);
        TokenPair tokens = tokenProvider.createTokenPair(saved);
        refreshTokenStore.store(tokens.refreshTokenId(), saved.getId(), tokens.refreshExpiresAt());
        return new AuthResult(AuthResponse.from(saved), tokens);
    }

    public AuthResult login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (user.getPassword() == null || !passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        TokenPair tokens = tokenProvider.createTokenPair(user);
        refreshTokenStore.store(tokens.refreshTokenId(), user.getId(), tokens.refreshExpiresAt());
        return new AuthResult(AuthResponse.from(user), tokens);
    }

    public TokenPair refresh(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token required");
        }
        JwtClaims claims = parseRefreshClaims(refreshToken);
        Long userId = Long.valueOf(claims.subject());
        if (!refreshTokenStore.matches(claims.tokenId(), userId)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token invalid");
        }

        refreshTokenStore.delete(claims.tokenId());
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        TokenPair tokens = tokenProvider.createTokenPair(user);
        refreshTokenStore.store(tokens.refreshTokenId(), userId, tokens.refreshExpiresAt());
        return tokens;
    }

    public void logout(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        try {
            JwtClaims claims = parseRefreshClaims(refreshToken);
            refreshTokenStore.delete(claims.tokenId());
        } catch (JwtException | IllegalArgumentException ignored) {
            // Ignore invalid refresh tokens on logout.
        }
    }

    public AuthResult handleOAuthLogin(AuthProvider provider, Map<String, Object> attributes) {
        String providerUserId = getProviderUserId(provider, attributes);
        if (providerUserId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "OAuth user id missing");
        }

        Optional<OAuthAccount> existing = oauthAccountRepository.findByProviderAndProviderUserId(provider, providerUserId);
        User user = existing.map(OAuthAccount::getUser)
            .orElseGet(() -> createOrLinkUser(provider, providerUserId, attributes));

        TokenPair tokens = tokenProvider.createTokenPair(user);
        refreshTokenStore.store(tokens.refreshTokenId(), user.getId(), tokens.refreshExpiresAt());
        return new AuthResult(AuthResponse.from(user), tokens);
    }

    private void validatePassword(String password) {
        if (!PASSWORD_POLICY.matcher(password).matches()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Password must be 8+ chars with upper/lowercase, number, and special character"
            );
        }
    }

    private JwtClaims parseRefreshClaims(String token) {
        try {
            JwtClaims claims = tokenProvider.parseToken(token);
            if (!tokenProvider.isRefreshToken(claims)) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token type");
            }
            return claims;
        } catch (JwtException | IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token invalid");
        }
    }

    private User createOrLinkUser(AuthProvider provider, String providerUserId, Map<String, Object> attributes) {
        String email = resolveEmail(provider, attributes);
        String nickname = resolveNickname(provider, attributes);

        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User created = new User();
            created.setEmail(email);
            created.setNickname(nickname);
            created.setRole(UserRole.USER);
            return userRepository.save(created);
        });

        OAuthAccount account = new OAuthAccount();
        account.setUser(user);
        account.setProvider(provider);
        account.setProviderUserId(providerUserId);
        oauthAccountRepository.save(account);
        return user;
    }

    private String resolveEmail(AuthProvider provider, Map<String, Object> attributes) {
        Object email = attributes.get("email");
        if (email != null && !email.toString().isBlank()) {
            return email.toString();
        }
        String providerId = getProviderUserId(provider, attributes);
        return provider.name().toLowerCase() + "-" + providerId + "@oauth.local";
    }

    private String resolveNickname(AuthProvider provider, Map<String, Object> attributes) {
        Object name = attributes.get("name");
        if (name != null && !name.toString().isBlank()) {
            return name.toString();
        }
        Object login = attributes.get("login");
        if (login != null && !login.toString().isBlank()) {
            return login.toString();
        }
        String providerId = getProviderUserId(provider, attributes);
        return provider.name().toLowerCase() + "_" + providerId;
    }

    private String getProviderUserId(AuthProvider provider, Map<String, Object> attributes) {
        Object idValue;
        if (provider == AuthProvider.GOOGLE) {
            idValue = attributes.get("sub");
        } else {
            idValue = attributes.get("id");
        }
        return idValue == null ? null : idValue.toString();
    }
}
