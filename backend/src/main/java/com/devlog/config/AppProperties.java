package com.devlog.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.boot.context.properties.ConfigurationProperties;
import lombok.Getter;
import lombok.Setter;
import org.springframework.validation.annotation.Validated;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "app")
public class AppProperties {
    @NotBlank
    private String frontendUrl;

    @Valid
    @NotNull
    private Jwt jwt = new Jwt();

    @Getter
    @Setter
    public static class Jwt {
        @NotBlank
        private String issuer;

        @NotBlank
        @Size(min = 32, message = "app.jwt.secret must be at least 32 characters")
        private String secret;

        @Min(1)
        private int accessTokenMinutes;

        @Min(1)
        private int refreshTokenDays;

        @Valid
        @NotNull
        private Cookie cookie = new Cookie();
    }

    @Getter
    @Setter
    public static class Cookie {
        @NotBlank
        private String accessName;

        @NotBlank
        private String refreshName;

        @NotBlank
        private String sameSite;

        private boolean secure;
    }
}
