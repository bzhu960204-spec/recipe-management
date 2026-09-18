package com.kitchenledger.web.dto;

import com.kitchenledger.domain.Tag;

public record TagResponse(
        Long id,
        String name,
        String slug,
        String colorToken,
        String coverImageKey,
        long recipeCount) {

    public static TagResponse from(Tag tag, long recipeCount) {
        return new TagResponse(
                tag.getId(), tag.getName(), tag.getSlug(), tag.getColorToken(), tag.getCoverImageKey(), recipeCount);
    }
}
