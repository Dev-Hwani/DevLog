package com.devlog.security;

import com.devlog.config.AppProperties;
import com.devlog.domain.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Component;

@Component
public class JwtTokenProvider {
    private static final String TYPE_CLAIM = "type";
    private static final String ACCESS_TYPE = "access";
    private static final String REFRESH_TYPE = "refresh";

    private final AppProperties appProperties;
    private final SecretKey secretKey;

    public JwtTokenProvider(AppProperties appProperties) {
        this.appProperties = appProperties;
        this.secretKey = Keys.hmacShaKeyFor(
            appProperties.getJwt().getSecret().getBytes(StandardCharsets.UTF_8)
        );
    }

    public TokenPair createTokenPair(User user) {
        String accessToken = createAccessToken(user);
        RefreshToken refresh = createRefreshToken(user);
        return new TokenPair(accessToken, refresh.token(), refresh.tokenId(), refresh.expiresAt());
    }

    public JwtClaims parseToken(String token) {
        Claims claims = Jwts.parser()
            .verifyWith(secretKey)
            .build()
            .parseSignedClaims(token)
            .getPayload();

        String type = claims.get(TYPE_CLAIM, String.class);
        String tokenId = claims.getId();
        Instant expiresAt = claims.getExpiration().toInstant();
        return new JwtClaims(claims.getSubject(), type, tokenId, expiresAt);
    }

    public boolean isAccessToken(JwtClaims claims) {
        return ACCESS_TYPE.equals(claims.type());
    }

    public boolean isRefreshToken(JwtClaims claims) {
        return REFRESH_TYPE.equals(claims.type());
    }

    private String createAccessToken(User user) {
        Instant now = Instant.now();
        Duration ttl = Duration.ofMinutes(appProperties.getJwt().getAccessTokenMinutes());
        Instant expiresAt = now.plus(ttl);

        return Jwts.builder()
            .issuer(appProperties.getJwt().getIssuer())
            .subject(String.valueOf(user.getId()))
            .claim("email", user.getEmail())
            .claim("role", user.getRole().name())
            .claim(TYPE_CLAIM, ACCESS_TYPE)
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiresAt))
            .signWith(secretKey, Jwts.SIG.HS256)
            .compact();
    }

    private RefreshToken createRefreshToken(User user) {
        Instant now = Instant.now();
        Duration ttl = Duration.ofDays(appProperties.getJwt().getRefreshTokenDays());
        Instant expiresAt = now.plus(ttl);
        String tokenId = UUID.randomUUID().toString();

        String token = Jwts.builder()
            .issuer(appProperties.getJwt().getIssuer())
            .subject(String.valueOf(user.getId()))
            .claim(TYPE_CLAIM, REFRESH_TYPE)
            .id(tokenId)
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiresAt))
            .signWith(secretKey, Jwts.SIG.HS256)
            .compact();

        return new RefreshToken(token, tokenId, expiresAt);
    }

    private record RefreshToken(String token, String tokenId, Instant expiresAt) {
    }
}
