package com.devlog.auth;

import com.devlog.auth.dto.AuthResponse;
import com.devlog.security.TokenPair;

public record AuthResult(AuthResponse response, TokenPair tokens) {
}
