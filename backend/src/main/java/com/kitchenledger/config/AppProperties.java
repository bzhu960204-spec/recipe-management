package com.kitchenledger.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "kitchen-ledger")
public record AppProperties(Jwt jwt, Storage storage, Security security, Admin admin) {

    public record Jwt(String secret, long expirationMinutes, String issuer) {
    }

    public record Storage(String uploadDir, long maxImageBytes) {
    }

    public record Security(int maxFailedLogins, int lockoutMinutes, List<String> allowedOrigins) {
    }

    public record Admin(String username, String password, String displayName) {
    }
}
