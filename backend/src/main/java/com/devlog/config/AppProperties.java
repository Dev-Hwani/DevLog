package com.devlog.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@ConfigurationProperties(prefix = "app")
public class AppProperties {
    private String frontendUrl;
    private Jwt jwt = new Jwt();

    @Getter
    @Setter
    public static class Jwt {
        private String issuer;
        private String secret;
        private int accessTokenMinutes;
        private int refreshTokenDays;
        private Cookie cookie = new Cookie();
    }

    @Getter
    @Setter
    public static class Cookie {
        private String accessName;
        private String refreshName;
        private String sameSite;
        private boolean secure;
    }
}
