package com.kitchenledger.web.dto;

import com.kitchenledger.domain.RecipeIngredient;
import com.kitchenledger.domain.RecipeStep;

import java.math.BigDecimal;
import java.util.List;

public record StepResponse(
        Long id,
        int sortOrder,
        String section,
        String title,
        String instruction,
        Integer durationSeconds,
        BigDecimal temperatureC,
        String imageUrl,
        String imageKey,
        List<Long> usedIngredientIds) {

    public static StepResponse from(RecipeStep step) {
        return new StepResponse(
                step.getId(),
                step.getSortOrder(),
                step.getSection(),
                step.getTitle(),
                step.getInstruction(),
                step.getDurationSeconds(),
                step.getTemperatureC(),
                step.getImageUrl(),
                step.getImageKey(),
                step.getUsedIngredients().stream().map(RecipeIngredient::getId).toList());
    }
}
