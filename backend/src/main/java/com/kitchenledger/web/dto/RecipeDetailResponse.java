package com.kitchenledger.web.dto;

import com.kitchenledger.domain.Difficulty;
import com.kitchenledger.domain.Recipe;
import com.kitchenledger.domain.SourceType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record RecipeDetailResponse(
        Long id,
        String title,
        String description,
        String sourceUrl,
        String sourceName,
        SourceType sourceType,
        String imageUrl,
        String imageKey,
        BigDecimal baseServings,
        String servingUnit,
        Integer prepMinutes,
        Integer cookMinutes,
        Integer totalMinutes,
        Difficulty difficulty,
        boolean favorite,
        String personalNotes,
        RecipeSummaryResponse.CategoryRef category,
        List<IngredientResponse> ingredients,
        List<StepResponse> steps,
        Instant createdAt,
        Instant updatedAt) {

    public static RecipeDetailResponse from(Recipe recipe) {
        return new RecipeDetailResponse(
                recipe.getId(),
                recipe.getTitle(),
                recipe.getDescription(),
                recipe.getSourceUrl(),
                recipe.getSourceName(),
                recipe.getSourceType(),
                recipe.getImageUrl(),
                recipe.getImageKey(),
                recipe.getBaseServings(),
                recipe.getServingUnit(),
                recipe.getPrepMinutes(),
                recipe.getCookMinutes(),
                recipe.getTotalMinutes(),
                recipe.getDifficulty(),
                recipe.isFavorite(),
                recipe.getPersonalNotes(),
                RecipeSummaryResponse.CategoryRef.from(recipe.getCategory()),
                recipe.getIngredients().stream().map(IngredientResponse::from).toList(),
                recipe.getSteps().stream().map(StepResponse::from).toList(),
                recipe.getCreatedAt(),
                recipe.getUpdatedAt());
    }
}
