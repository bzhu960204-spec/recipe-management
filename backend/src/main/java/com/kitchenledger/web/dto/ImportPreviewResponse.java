package com.kitchenledger.web.dto;

import java.util.List;

/**
 * Dry-run result. Nothing has been written at this point: the UI shows each recipe with its
 * warnings so the user can correct the data before committing.
 */
public record ImportPreviewResponse(int recipeCount, List<Item> items) {

    public record Item(int index, RecipeUpsertRequest recipe, List<String> warnings) {
    }
}
