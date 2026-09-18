package com.kitchenledger.service;

import com.kitchenledger.config.AppProperties;
import com.kitchenledger.domain.User;
import com.kitchenledger.repository.UserRepository;
import com.kitchenledger.security.JwtService;
import com.kitchenledger.web.dto.LoginRequest;
import com.kitchenledger.web.dto.LoginResponse;
import com.kitchenledger.web.dto.UserResponse;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AppProperties.Security securityConfig;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            AppProperties properties) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.securityConfig = properties.security();
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        Optional<User> found = userRepository.findByUsernameIgnoreCase(request.username());

        // Hash even when the user is missing so response timing does not leak which usernames exist.
        // The placeholder must be a well-formed BCrypt hash, otherwise matches() logs a misleading
        // "Encoded password does not look like BCrypt" warning on every unknown-username attempt.
        if (found.isEmpty()) {
            passwordEncoder.matches(request.password(), "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy");
            throw new BadCredentialsException("Invalid username or password");
        }

        User user = found.get();
        if (user.isCurrentlyLocked()) {
            throw new LockedException("Too many failed attempts. Try again later.");
        }
        if (!user.isEnabled()) {
            throw new BadCredentialsException("Invalid username or password");
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            registerFailure(user);
            throw new BadCredentialsException("Invalid username or password");
        }

        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);

        String token = jwtService.issue(user.getId(), user.getUsername(), user.getRole().name());
        return new LoginResponse(token, jwtService.expiresInSeconds(), UserResponse.from(user));
    }

    private void registerFailure(User user) {
        int attempts = user.getFailedLoginAttempts() + 1;
        user.setFailedLoginAttempts(attempts);
        if (attempts >= securityConfig.maxFailedLogins()) {
            user.setLockedUntil(Instant.now().plus(Duration.ofMinutes(securityConfig.lockoutMinutes())));
            user.setFailedLoginAttempts(0);
        }
    }
}
