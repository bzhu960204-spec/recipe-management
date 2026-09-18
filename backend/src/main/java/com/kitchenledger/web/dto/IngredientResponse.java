package com.kitchenledger.web.dto;

import com.kitchenledger.domain.RecipeIngredient;

import java.math.BigDecimal;

public record IngredientResponse(
        Long id,
        int sortOrder,
        String section,
        String refKey,
        BigDecimal quantityMin,
        BigDecimal quantityMax,
        String unit,
        String canonicalUnit,
        String name,
        String note,
        String rawText,
        boolean scalable,
        boolean optional) {

    public static IngredientResponse from(RecipeIngredient ingredient) {
        return new IngredientResponse(
                ingredient.getId(),
                ingredient.getSortOrder(),
                ingredient.getSection(),
                ingredient.getRefKey(),
                ingredient.getQuantityMin(),
                ingredient.getQuantityMax(),
                ingredient.getUnit(),
                ingredient.getCanonicalUnit(),
                ingredient.getName(),
                ingredient.getNote(),
                ingredient.getRawText(),
                ingredient.isScalable(),
                ingredient.isOptional());
    }
}
