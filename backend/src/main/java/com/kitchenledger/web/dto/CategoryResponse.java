package com.kitchenledger.web.dto;

import com.kitchenledger.domain.Category;

public record CategoryResponse(
        Long id,
        String name,
        String slug,
        String colorToken,
        String coverImageKey,
        long recipeCount) {

    public static CategoryResponse from(Category category, long recipeCount) {
        return new CategoryResponse(
                category.getId(), category.getName(), category.getSlug(),
                category.getColorToken(), category.getCoverImageKey(), recipeCount);
    }
}
