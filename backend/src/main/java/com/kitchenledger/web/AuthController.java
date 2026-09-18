package com.kitchenledger.web;

import com.kitchenledger.security.JwtAuthenticationFilter;
import com.kitchenledger.service.AuthService;
import com.kitchenledger.service.UserService;
import com.kitchenledger.security.CurrentUser;
import com.kitchenledger.web.dto.ChangePasswordRequest;
import com.kitchenledger.web.dto.LoginRequest;
import com.kitchenledger.web.dto.LoginResponse;
import com.kitchenledger.web.dto.UpdatePreferencesRequest;
import com.kitchenledger.web.dto.UserResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final UserService userService;

    public AuthController(AuthService authService, UserService userService) {
        this.authService = authService;
        this.userService = userService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, imageCookie(response.token(), response.expiresInSeconds()).toString())
                .body(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, imageCookie("", 0).toString())
                .build();
    }

    @GetMapping("/me")
    public UserResponse me() {
        return userService.currentUser(CurrentUser.requireId());
    }

    @PatchMapping("/me/preferences")
    public UserResponse updatePreferences(@Valid @RequestBody UpdatePreferencesRequest request) {
        return userService.updatePreferences(CurrentUser.requireId(), request);
    }

    @PostMapping("/me/password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(CurrentUser.requireId(), request);
        return ResponseEntity.noContent().build();
    }

    /** Exists only so <img> requests to /api/images/** can authenticate; SameSite=Strict blocks CSRF. */
    private ResponseCookie imageCookie(String value, long maxAgeSeconds) {
        return ResponseCookie.from(JwtAuthenticationFilter.COOKIE_NAME, value)
                .httpOnly(true)
                .secure(false)
                .sameSite("Strict")
                .path("/")
                .maxAge(Duration.ofSeconds(maxAgeSeconds))
                .build();
    }
}
