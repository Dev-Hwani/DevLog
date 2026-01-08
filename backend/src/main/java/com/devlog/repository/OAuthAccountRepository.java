package com.devlog.repository;

import com.devlog.domain.OAuthAccount;
import com.devlog.domain.enums.AuthProvider;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OAuthAccountRepository extends JpaRepository<OAuthAccount, Long> {
    Optional<OAuthAccount> findByProviderAndProviderUserId(AuthProvider provider, String providerUserId);
}
