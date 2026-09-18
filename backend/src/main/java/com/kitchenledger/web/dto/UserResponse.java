package com.kitchenledger.web.dto;

import com.kitchenledger.domain.Role;
import com.kitchenledger.domain.User;

import java.time.Instant;

public record UserResponse(
        Long id,
        String username,
        String email,
        String displayName,
        Role role,
        String themeId,
        String themeMode,
        boolean enabled,
        Instant createdAt) {

    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getDisplayName(),
                user.getRole(),
                user.getThemeId(),
                user.getThemeMode(),
                user.isEnabled(),
                user.getCreatedAt());
    }
}
