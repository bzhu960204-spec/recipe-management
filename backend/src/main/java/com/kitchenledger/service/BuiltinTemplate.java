package com.kitchenledger.service;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * The import formats shipped with the app, loaded from the classpath so they stay git-diffable.
 * Each is seeded into a user's library once (matched by slug); their edits from then on live only
 * in the database.
 */
@Component
public class BuiltinTemplate {

    /** A seedable format: what the importer somewhere in the app expects. */
    public record Definition(String name, String slug, String description, String schema, String example) {
    }

    private static final String ROOT = "prompt-templates/";

    private final List<Definition> definitions;

    public BuiltinTemplate() {
        this.definitions = List.of(
                new Definition(
                        "Recipe extraction",
                        "recipe-extraction",
                        "The JSON shape the importer accepts. Have any model produce this, "
                                + "then paste the result into Import.",
                        read("recipe-extraction/schema.json"),
                        read("recipe-extraction/example.json")),
                new Definition(
                        "Ingredient quick import",
                        "ingredient-flat",
                        "Flat-text format for pasting an ingredient list into the recipe editor.",
                        read("ingredient-flat/format.md"),
                        null),
                new Definition(
                        "Recipe basics",
                        "recipe-basics",
                        "JSON for the Basics block of a recipe. Import merges the keys you include; "
                                + "Update replaces the whole block.",
                        read("recipe-basics/schema.json"),
                        read("recipe-basics/example.json")),
                new Definition(
                        "Recipe ingredients",
                        "recipe-ingredients",
                        "JSON for the Ingredients block. Import updates matches by ref/name and appends "
                                + "the rest; Update replaces the list.",
                        read("recipe-ingredients/schema.json"),
                        read("recipe-ingredients/example.json")),
                new Definition(
                        "Recipe method",
                        "recipe-method",
                        "JSON for the Method block. Import appends steps; Update replaces the list.",
                        read("recipe-method/schema.json"),
                        read("recipe-method/example.json")));
    }

    public List<Definition> all() {
        return definitions;
    }

    public static String read(String fileName) {
        try (InputStream stream = new ClassPathResource(ROOT + fileName).getInputStream()) {
            return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException ex) {
            throw new UncheckedIOException("Missing built-in template resource: " + ROOT + fileName, ex);
        }
    }
}
