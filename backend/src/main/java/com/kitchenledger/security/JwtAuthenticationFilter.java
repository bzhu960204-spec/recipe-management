package com.kitchenledger.security;

import com.kitchenledger.domain.User;
import com.kitchenledger.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.Optional;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    public static final String COOKIE_NAME = "kl_token";
    private static final String BEARER = "Bearer ";
    private static final String IMAGE_PATH_PREFIX = "/api/images/";

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            resolveToken(request)
                    .flatMap(jwtService::parse)
                    .map(claims -> Long.valueOf(claims.getSubject()))
                    // Re-read the user so a disabled account loses access immediately, not at token expiry.
                    .flatMap(userRepository::findById)
                    .filter(User::isEnabled)
                    .ifPresent(user -> authenticate(request, user));
        }

        filterChain.doFilter(request, response);
    }

    private void authenticate(HttpServletRequest request, User user) {
        AppUserPrincipal principal = new AppUserPrincipal(
                user.getId(), user.getUsername(), user.getPasswordHash(), user.getRole(), true);
        var authentication = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    private Optional<String> resolveToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith(BEARER)) {
            return Optional.of(header.substring(BEARER.length()));
        }
        // <img> cannot send an Authorization header, so image reads fall back to the cookie.
        // Limiting the cookie to this one read-only path keeps mutating endpoints CSRF-proof.
        if ("GET".equals(request.getMethod()) && request.getRequestURI().startsWith(IMAGE_PATH_PREFIX)) {
            return cookieToken(request);
        }
        return Optional.empty();
    }

    private Optional<String> cookieToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return Optional.empty();
        }
        return Arrays.stream(cookies)
                .filter(cookie -> COOKIE_NAME.equals(cookie.getName()))
                .map(Cookie::getValue)
                .findFirst();
    }
}
