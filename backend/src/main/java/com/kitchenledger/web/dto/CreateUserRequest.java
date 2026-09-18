package com.kitchenledger.web.dto;

import com.kitchenledger.domain.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateUserRequest(
        @NotBlank
        @Size(min = 3, max = 64)
        @Pattern(regexp = "[a-zA-Z0-9._-]+", message = "letters, digits, dot, underscore and dash only")
        String username,

        @NotBlank
        @Size(min = 8, max = 128, message = "password must be at least 8 characters")
        String password,

        @Email
        @Size(max = 255)
        String email,

        @Size(max = 128)
        String displayName,

        Role role) {
}
