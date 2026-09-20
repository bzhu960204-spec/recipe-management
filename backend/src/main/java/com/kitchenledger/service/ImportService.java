package com.kitchenledger.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kitchenledger.domain.Difficulty;
import com.kitchenledger.domain.SourceType;
import com.kitchenledger.service.ingredient.IngredientParser;
import com.kitchenledger.service.ingredient.ParsedIngredient;
import com.kitchenledger.web.dto.ImportPreviewResponse;
import com.kitchenledger.web.dto.RecipeUpsertRequest;
import com.kitchenledger.web.error.BadRequestException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URI;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Normalises loosely-shaped import JSON into the strict write model, collecting warnings
 * instead of failing. Nothing here touches the database: the caller previews, the user
 * corrects, and only then is the result committed.
 */
@Service
public class ImportService {

    private static final Set<String> KNOWN_RECIPE_KEYS = Set.of(
            "title", "name", "description", "summary", "source", "sourceUrl", "sourceName", "sourceType",
            "url", "imageUrl", "image", "servings", "serves", "yield", "times", "prepMinutes", "cookMinutes",
            "totalMinutes", "prepTime", "cookTime", "totalTime", "difficulty", "category",
            "ingredients", "steps", "instructions", "notes", "personalNotes", "favorite", "schemaVersion");

    private static final int MAX_RECIPES_PER_IMPORT = 200;

    private final IngredientParser ingredientParser;
    private final ObjectMapper objectMapper;

    public ImportService(IngredientParser ingredientParser, ObjectMapper objectMapper) {
        this.ingredientParser = ingredientParser;
        this.objectMapper = objectMapper;
    }

    public ImportPreviewResponse preview(JsonNode root) {
        List<JsonNode> recipeNodes = extractRecipeNodes(root);
        if (recipeNodes.isEmpty()) {
            throw new BadRequestException("No recipes found in the supplied JSON");
        }
        if (recipeNodes.size() > MAX_RECIPES_PER_IMPORT) {
            throw new BadRequestException("Import is limited to " + MAX_RECIPES_PER_IMPORT + " recipes at a time");
        }

        List<ImportPreviewResponse.Item> items = new ArrayList<>();
        for (int index = 0; index < recipeNodes.size(); index++) {
            List<String> warnings = new ArrayList<>();
            RecipeUpsertRequest recipe = toRecipe(recipeNodes.get(index), warnings);
            items.add(new ImportPreviewResponse.Item(index, recipe, warnings));
        }
        return new ImportPreviewResponse(items.size(), items);
    }

    public JsonNode readJson(String text) {
        if (text == null || text.isBlank()) {
            throw new BadRequestException("Paste some JSON first");
        }
        try {
            return objectMapper.readTree(text);
        } catch (JsonProcessingException ex) {
            throw new BadRequestException("That is not valid JSON: " + ex.getOriginalMessage());
        }
    }

    private List<JsonNode> extractRecipeNodes(JsonNode root) {
        List<JsonNode> nodes = new ArrayList<>();
        if (root == null || root.isNull()) {
            return nodes;
        }
        if (root.isArray()) {
            root.forEach(nodes::add);
            return nodes;
        }
        if (root.isObject() && root.has("recipes") && root.get("recipes").isArray()) {
            root.get("recipes").forEach(nodes::add);
            return nodes;
        }
        if (root.isObject()) {
            nodes.add(root);
        }
        return nodes;
    }

    private RecipeUpsertRequest toRecipe(JsonNode node, List<String> warnings) {
        if (!node.isObject()) {
            warnings.add("Entry is not a JSON object and was skipped");
            return new RecipeUpsertRequest("Untitled recipe", null, null, null, null, null, null, null, null,
                    null, null, List.of(), List.of(), node.toString());
        }

        reportUnknownKeys(node, warnings);

        String title = text(node, "title", "name");
        if (title == null || title.isBlank()) {
            title = "Untitled recipe";
            warnings.add("Missing title; set a placeholder");
        }

        return new RecipeUpsertRequest(
                title,
                text(node, "description", "summary"),
                readSource(node, warnings),
                readImageUrl(node, warnings),
                null,
                readServings(node, warnings),
                readTimes(node, warnings),
                readDifficulty(node, warnings),
                node.path("favorite").asBoolean(false),
                text(node, "notes", "personalNotes"),
                readCategory(node),
                readIngredients(node, warnings),
                readSteps(node, warnings),
                node.toString());
    }

    private void reportUnknownKeys(JsonNode node, List<String> warnings) {
        List<String> unknown = new ArrayList<>();
        Iterator<String> names = node.fieldNames();
        while (names.hasNext()) {
            String name = names.next();
            if (!KNOWN_RECIPE_KEYS.contains(name)) {
                unknown.add(name);
            }
        }
        if (!unknown.isEmpty()) {
            warnings.add("Ignored unrecognised field(s): " + String.join(", ", unknown));
        }
    }

    private RecipeUpsertRequest.SourceInput readSource(JsonNode node, List<String> warnings) {
        JsonNode source = node.get("source");
        String url = null;
        String name = null;
        SourceType type = null;

        if (source != null && source.isObject()) {
            url = text(source, "url");
            name = text(source, "name");
            type = readSourceType(text(source, "type"), warnings);
        } else if (source != null && source.isTextual()) {
            String value = source.asText().trim();
            if (value.startsWith("http")) {
                url = value;
            } else {
                name = value;
            }
        }

        if (url == null) {
            url = text(node, "sourceUrl", "url");
        }
        if (name == null) {
            name = text(node, "sourceName");
        }
        if (type == null) {
            type = readSourceType(text(node, "sourceType"), warnings);
        }

        if (url != null && !isSafeHttpUrl(url)) {
            warnings.add("Dropped source URL with an unsupported scheme");
            url = null;
        }
        if (name == null && url != null) {
            name = hostOf(url);
        }
        if (url == null && name == null && type == null) {
            return null;
        }
        return new RecipeUpsertRequest.SourceInput(url, name, type);
    }

    private SourceType readSourceType(String value, List<String> warnings) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return SourceType.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            warnings.add("Unknown source type '" + value + "'; left blank");
            return null;
        }
    }

    private String readImageUrl(JsonNode node, List<String> warnings) {
        String url = text(node, "imageUrl", "image");
        if (url == null) {
            return null;
        }
        if (!isSafeHttpUrl(url)) {
            warnings.add("Dropped image URL with an unsupported scheme");
            return null;
        }
        return url;
    }

    private RecipeUpsertRequest.ServingsInput readServings(JsonNode node, List<String> warnings) {
        JsonNode servings = node.has("servings") ? node.get("servings") : node.get("serves");
        if (servings == null || servings.isNull()) {
            return null;
        }

        if (servings.isObject()) {
            BigDecimal amount = decimal(servings.get("amount"));
            String unit = text(servings, "unit");
            if (amount == null) {
                warnings.add("Servings amount was not a number; left blank");
            }
            return amount == null && unit == null ? null : new RecipeUpsertRequest.ServingsInput(amount, unit);
        }
        if (servings.isNumber()) {
            return new RecipeUpsertRequest.ServingsInput(servings.decimalValue(), "servings");
        }
        if (servings.isTextual()) {
            BigDecimal[] range = ingredientParser.parseQuantityRange(servings.asText());
            if (range[0] == null) {
                warnings.add("Could not read servings from '" + servings.asText() + "'");
                return null;
            }
            return new RecipeUpsertRequest.ServingsInput(range[0], "servings");
        }
        return null;
    }

    private RecipeUpsertRequest.TimesInput readTimes(JsonNode node, List<String> warnings) {
        JsonNode times = node.get("times");
        JsonNode holder = times != null && times.isObject() ? times : node;

        Integer prep = minutes(holder, warnings, "prepMinutes", "prepTime");
        Integer cook = minutes(holder, warnings, "cookMinutes", "cookTime");
        Integer total = minutes(holder, warnings, "totalMinutes", "totalTime");

        if (prep == null && cook == null && total == null) {
            return null;
        }
        // Derive here as well as on save, so the preview shows the user the value that will be stored.
        if (total == null && (prep != null || cook != null)) {
            total = (prep == null ? 0 : prep) + (cook == null ? 0 : cook);
        }
        return new RecipeUpsertRequest.TimesInput(prep, cook, total);
    }

    private Integer minutes(JsonNode node, List<String> warnings, String... keys) {
        for (String key : keys) {
            JsonNode value = node.get(key);
            if (value == null || value.isNull()) {
                continue;
            }
            if (value.isNumber()) {
                return value.asInt();
            }
            if (value.isTextual()) {
                BigDecimal[] range = ingredientParser.parseQuantityRange(value.asText());
                if (range[0] != null) {
                    return range[0].intValue();
                }
                warnings.add("Could not read a duration from '" + value.asText() + "'");
            }
        }
        return null;
    }

    private Difficulty readDifficulty(JsonNode node, List<String> warnings) {
        String value = text(node, "difficulty");
        if (value == null) {
            return null;
        }
        try {
            return Difficulty.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            warnings.add("Unknown difficulty '" + value + "'; left blank");
            return null;
        }
    }

    private String readCategory(JsonNode node) {
        JsonNode category = node.get("category");
        if (category == null || category.isNull() || !category.isTextual()) {
            return null;
        }
        String value = category.asText().trim();
        return value.isEmpty() ? null : value;
    }

    private List<RecipeUpsertRequest.IngredientInput> readIngredients(JsonNode node, List<String> warnings) {
        JsonNode ingredients = node.get("ingredients");
        if (ingredients == null || !ingredients.isArray() || ingredients.isEmpty()) {
            warnings.add("No ingredients found");
            return List.of();
        }

        List<RecipeUpsertRequest.IngredientInput> result = new ArrayList<>();
        int position = 0;
        for (JsonNode entry : ingredients) {
            position++;
            if (entry.isTextual()) {
                result.add(fromParsed(ingredientParser.parse(entry.asText()), null, null));
                continue;
            }
            if (!entry.isObject()) {
                warnings.add("Ingredient " + position + " was not text or an object and was skipped");
                continue;
            }

            String name = text(entry, "name", "ingredient", "item");
            String raw = text(entry, "rawText", "raw", "text");
            String section = text(entry, "section", "group", "heading");

            if (name == null && raw != null) {
                ParsedIngredient parsed = ingredientParser.parse(raw);
                result.add(fromParsed(parsed, text(entry, "ref", "id"), section));
                warnings.add("Ingredient " + position + " had no name; parsed it from the raw text");
                continue;
            }
            if (name == null) {
                warnings.add("Ingredient " + position + " had no usable name and was skipped");
                continue;
            }

            BigDecimal[] range = readQuantity(entry, position, warnings);
            result.add(new RecipeUpsertRequest.IngredientInput(
                    text(entry, "ref", "id"),
                    section,
                    range[0],
                    range[1] != null ? range[1] : decimal(entry.get("quantityMax")),
                    text(entry, "unit"),
                    name,
                    text(entry, "note", "preparation"),
                    raw,
                    entry.has("scalable") ? entry.get("scalable").asBoolean(true) : null,
                    entry.path("optional").asBoolean(false)));
        }
        return result;
    }

    private BigDecimal[] readQuantity(JsonNode entry, int position, List<String> warnings) {
        JsonNode quantity = entry.has("quantity") ? entry.get("quantity") : entry.get("amount");
        if (quantity == null || quantity.isNull()) {
            return new BigDecimal[2];
        }
        if (quantity.isNumber()) {
            return new BigDecimal[] {quantity.decimalValue(), null};
        }
        if (quantity.isTextual()) {
            BigDecimal[] range = ingredientParser.parseQuantityRange(quantity.asText());
            if (range[0] == null) {
                warnings.add("Ingredient " + position + ": could not read quantity '" + quantity.asText() + "'");
            }
            return range;
        }
        return new BigDecimal[2];
    }

    private RecipeUpsertRequest.IngredientInput fromParsed(ParsedIngredient parsed, String ref, String section) {
        return new RecipeUpsertRequest.IngredientInput(
                ref,
                section,
                parsed.quantityMin(),
                parsed.quantityMax(),
                parsed.unit(),
                parsed.name(),
                parsed.note(),
                parsed.rawText(),
                parsed.scalable(),
                parsed.optional());
    }

    private List<RecipeUpsertRequest.StepInput> readSteps(JsonNode node, List<String> warnings) {
        JsonNode steps = node.has("steps") ? node.get("steps") : node.get("instructions");
        if (steps == null || !steps.isArray() || steps.isEmpty()) {
            warnings.add("No steps found");
            return List.of();
        }

        List<RecipeUpsertRequest.StepInput> result = new ArrayList<>();
        int position = 0;
        for (JsonNode entry : steps) {
            position++;
            if (entry.isTextual()) {
                if (entry.asText().isBlank()) {
                    continue;
                }
                result.add(new RecipeUpsertRequest.StepInput(
                        null, null, entry.asText().trim(), null, null, null, List.of()));
                continue;
            }
            if (!entry.isObject()) {
                warnings.add("Step " + position + " was not text or an object and was skipped");
                continue;
            }

            String instruction = text(entry, "text", "instruction", "body", "description");
            if (instruction == null || instruction.isBlank()) {
                warnings.add("Step " + position + " had no text and was skipped");
                continue;
            }

            result.add(new RecipeUpsertRequest.StepInput(
                    text(entry, "section", "phase"),
                    text(entry, "title"),
                    instruction,
                    readDurationSeconds(entry),
                    readTemperature(entry),
                    text(entry, "imageUrl"),
                    readUses(entry)));
        }
        return result;
    }

    private Integer readDurationSeconds(JsonNode entry) {
        JsonNode seconds = entry.get("durationSeconds");
        if (seconds != null && seconds.isNumber()) {
            return seconds.asInt();
        }
        JsonNode minutes = entry.get("minutes");
        if (minutes != null && minutes.isNumber()) {
            return minutes.asInt() * 60;
        }
        return null;
    }

    private BigDecimal readTemperature(JsonNode entry) {
        JsonNode temperature = entry.get("temperature");
        if (temperature == null || temperature.isNull()) {
            return decimal(entry.get("temperatureC"));
        }
        if (temperature.isNumber()) {
            return temperature.decimalValue();
        }
        if (temperature.isObject()) {
            BigDecimal value = decimal(temperature.get("value"));
            String unit = text(temperature, "unit");
            if (value != null && unit != null && unit.trim().equalsIgnoreCase("F")) {
                return value.subtract(new BigDecimal("32"))
                        .multiply(new BigDecimal("5"))
                        .divide(new BigDecimal("9"), 2, java.math.RoundingMode.HALF_UP);
            }
            return value;
        }
        return null;
    }

    private List<String> readUses(JsonNode entry) {
        JsonNode uses = entry.has("uses") ? entry.get("uses") : entry.get("ingredientRefs");
        if (uses == null || !uses.isArray()) {
            return List.of();
        }
        List<String> refs = new ArrayList<>();
        for (JsonNode use : uses) {
            if (use.isTextual() && !use.asText().isBlank()) {
                refs.add(use.asText().trim());
            }
        }
        return refs;
    }

    private boolean isSafeHttpUrl(String value) {
        try {
            String scheme = URI.create(value.trim()).getScheme();
            return scheme != null && (scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"));
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private String hostOf(String url) {
        try {
            String host = URI.create(url).getHost();
            return host == null ? null : host.replaceFirst("^www\\.", "");
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private static BigDecimal decimal(JsonNode node) {
        return node != null && node.isNumber() ? node.decimalValue() : null;
    }

    private static String text(JsonNode node, String... keys) {
        for (String key : keys) {
            JsonNode value = node.get(key);
            if (value != null && value.isTextual() && !value.asText().isBlank()) {
                return value.asText().trim();
            }
        }
        return null;
    }
}
