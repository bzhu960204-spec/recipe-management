package com.kitchenledger.security;

import com.kitchenledger.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Optional;

@Service
public class JwtService {

    private final SecretKey key;
    private final AppProperties.Jwt config;

    public JwtService(AppProperties properties) {
        this.config = properties.jwt();
        byte[] secret = config.secret().getBytes(StandardCharsets.UTF_8);
        if (secret.length < 32) {
            throw new IllegalStateException("kitchen-ledger.jwt.secret must be at least 32 bytes");
        }
        this.key = Keys.hmacShaKeyFor(secret);
    }

    public String issue(Long userId, String username, String role) {
        Instant now = Instant.now();
        return Jwts.builder()
                .issuer(config.issuer())
                .subject(String.valueOf(userId))
                .claim("username", username)
                .claim("role", role)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(config.expirationMinutes(), ChronoUnit.MINUTES)))
                .signWith(key)
                .compact();
    }

    public long expiresInSeconds() {
        return config.expirationMinutes() * 60;
    }

    public Optional<Claims> parse(String token) {
        try {
            return Optional.of(Jwts.parser()
                    .verifyWith(key)
                    .requireIssuer(config.issuer())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload());
        } catch (JwtException | IllegalArgumentException ex) {
            return Optional.empty();
        }
    }
}
