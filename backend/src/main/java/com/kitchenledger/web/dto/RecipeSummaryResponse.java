package com.kitchenledger.web.dto;

import com.kitchenledger.domain.Difficulty;
import com.kitchenledger.domain.Recipe;
import com.kitchenledger.domain.SourceType;
import com.kitchenledger.domain.Tag;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

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
        List<TagRef> tags,
        Instant updatedAt) {

    public record TagRef(Long id, String name, String slug) {
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
                recipe.getTags().stream()
                        .sorted(Comparator.comparing(Tag::getName))
                        .map(tag -> new TagRef(tag.getId(), tag.getName(), tag.getSlug()))
                        .toList(),
                recipe.getUpdatedAt());
    }
}
