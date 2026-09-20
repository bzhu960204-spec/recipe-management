package com.kitchenledger.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kitchenledger.service.ingredient.IngredientParser;
import com.kitchenledger.web.dto.ImportPreviewResponse;
import com.kitchenledger.web.dto.RecipeUpsertRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The import contract only exists inside {@link ImportService}. Without this test the shipped
 * recipe format would drift away from it silently, and the first sign of trouble would be a bad import.
 */
class BuiltinTemplateTest {

    private final ImportService importService = new ImportService(new IngredientParser(), new ObjectMapper());
    private final ObjectMapper objectMapper = new ObjectMapper();

    private ImportPreviewResponse previewExample() {
        return importService.preview(
                importService.readJson(BuiltinTemplate.read("recipe-extraction/example.json")));
    }

    @Test
    @DisplayName("the shipped example imports with no warnings at all")
    void exampleImportsCleanly() {
        ImportPreviewResponse preview = previewExample();

        assertThat(preview.recipeCount()).isEqualTo(1);
        assertThat(preview.items().get(0).warnings()).isEmpty();
    }

    @Test
    @DisplayName("the example survives the round trip with its content intact")
    void exampleKeepsItsContent() {
        RecipeUpsertRequest recipe = previewExample().items().get(0).recipe();

        assertThat(recipe.title()).isEqualTo("炸鱼柳");
        assertThat(recipe.ingredients()).isNotEmpty();
        assertThat(recipe.steps()).isNotEmpty();
        assertThat(recipe.category()).isNotBlank();
    }

    @Test
    @DisplayName("every step reference resolves to an ingredient ref")
    void stepReferencesResolve() {
        RecipeUpsertRequest recipe = previewExample().items().get(0).recipe();

        Set<String> refs = recipe.ingredients().stream()
                .map(RecipeUpsertRequest.IngredientInput::ref)
                .filter(ref -> ref != null)
                .collect(Collectors.toSet());

        List<String> used = recipe.steps().stream()
                .flatMap(step -> step.uses().stream())
                .toList();

        assertThat(used).isNotEmpty();
        assertThat(refs).containsAll(used);
    }

    @Test
    @DisplayName("the shipped recipe schema is valid JSON")
    void schemaIsParseable() throws Exception {
        assertThat(objectMapper.readTree(BuiltinTemplate.read("recipe-extraction/schema.json")).isObject())
                .isTrue();
    }
}
