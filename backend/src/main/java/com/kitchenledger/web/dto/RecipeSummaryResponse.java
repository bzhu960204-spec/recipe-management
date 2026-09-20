package com.kitchenledger.web.dto;

import com.kitchenledger.domain.Category;
import com.kitchenledger.domain.Difficulty;
import com.kitchenledger.domain.Recipe;
import com.kitchenledger.domain.SourceType;

import java.time.Instant;

/** Shape used by the middle list column: cheap enough to render hundreds of rows. */
public record RecipeSummaryResponse(
        Long id,
        String title,
        String sourceName,
        SourceType sourceType,
        String imageUrl,
        String imageKey,
        Integer totalMinutes,
        Difficulty difficulty,
        boolean favorite,
        int ingredientCount,
        CategoryRef category,
        Instant updatedAt) {

    public record CategoryRef(Long id, String name, String slug) {
        public static CategoryRef from(Category category) {
            return category == null ? null : new CategoryRef(category.getId(), category.getName(), category.getSlug());
        }
    }

    public static RecipeSummaryResponse from(Recipe recipe) {
        return new RecipeSummaryResponse(
                recipe.getId(),
                recipe.getTitle(),
                recipe.getSourceName(),
                recipe.getSourceType(),
                recipe.getImageUrl(),
                recipe.getImageKey(),
                recipe.getTotalMinutes(),
                recipe.getDifficulty(),
                recipe.isFavorite(),
                recipe.getIngredients().size(),
                CategoryRef.from(recipe.getCategory()),
                recipe.getUpdatedAt());
    }
}
