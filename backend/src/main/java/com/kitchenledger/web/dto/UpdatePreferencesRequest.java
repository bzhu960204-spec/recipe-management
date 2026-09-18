package com.kitchenledger.web.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdatePreferencesRequest(
        @Size(max = 128) String displayName,
        @Pattern(regexp = "fresh|editorial|minimal") String themeId,
        @Pattern(regexp = "light|dark") String themeMode) {
}
