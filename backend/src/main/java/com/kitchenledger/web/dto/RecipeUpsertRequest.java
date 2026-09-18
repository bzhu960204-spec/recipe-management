package com.kitchenledger.web.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.kitchenledger.domain.Difficulty;
import com.kitchenledger.domain.SourceType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

/**
 * Canonical write shape. The manual editor posts this directly; the importer normalises
 * loose JSON into this same record so both paths share one validation and persistence route.
 */
public record RecipeUpsertRequest(
        @NotBlank @Size(max = 255) String title,
        String description,
        @Valid SourceInput source,
        @Size(max = 2048) String imageUrl,
        @Size(max = 160) String imageKey,
        @Valid ServingsInput servings,
        @Valid TimesInput times,
        Difficulty difficulty,
        Boolean favorite,
        @JsonAlias("personalNotes") String notes,
        List<@Size(max = 80) String> tags,
        @Valid List<IngredientInput> ingredients,
        @Valid List<StepInput> steps,
        /** Set by the importer so the original document survives future schema changes. */
        String importPayload) {

    public record SourceInput(
            @Size(max = 2048) String url,
            @Size(max = 255) String name,
            SourceType type) {
    }

    public record ServingsInput(
            @Positive BigDecimal amount,
            @Size(max = 64) String unit) {
    }

    public record TimesInput(
            @PositiveOrZero Integer prepMinutes,
            @PositiveOrZero Integer cookMinutes,
            @PositiveOrZero Integer totalMinutes) {
    }

    public record IngredientInput(
            @JsonAlias("id") @Size(max = 64) String ref,
            @Size(max = 120) String section,
            BigDecimal quantity,
            BigDecimal quantityMax,
            @Size(max = 48) String unit,
            @NotBlank @Size(max = 255) String name,
            @Size(max = 255) String note,
            @Size(max = 512) String rawText,
            Boolean scalable,
            Boolean optional) {
    }

    public record StepInput(
            @Size(max = 120) String section,
            @Size(max = 255) String title,
            @NotBlank @JsonAlias("text") String instruction,
            @PositiveOrZero Integer durationSeconds,
            BigDecimal temperatureC,
            @Size(max = 2048) String imageUrl,
            /** Ingredient {@code ref} values this step consumes. */
            List<String> uses) {
    }
}
