package com.kitchenledger.service.ingredient;

import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Maps the many ways a unit gets written onto a single canonical token.
 * The canonical value is what a future shopping list will aggregate on.
 */
public final class UnitNormalizer {

    private static final Map<String, String> ALIASES = Map.ofEntries(
            Map.entry("g", "g"), Map.entry("gr", "g"), Map.entry("gram", "g"), Map.entry("grams", "g"),
            Map.entry("kg", "kg"), Map.entry("kilogram", "kg"), Map.entry("kilograms", "kg"),
            Map.entry("mg", "mg"), Map.entry("milligram", "mg"), Map.entry("milligrams", "mg"),
            Map.entry("ml", "ml"), Map.entry("milliliter", "ml"), Map.entry("milliliters", "ml"),
            Map.entry("millilitre", "ml"), Map.entry("millilitres", "ml"),
            Map.entry("l", "l"), Map.entry("liter", "l"), Map.entry("liters", "l"),
            Map.entry("litre", "l"), Map.entry("litres", "l"),
            Map.entry("tsp", "tsp"), Map.entry("tsps", "tsp"), Map.entry("teaspoon", "tsp"),
            Map.entry("teaspoons", "tsp"),
            Map.entry("tbsp", "tbsp"), Map.entry("tbsps", "tbsp"), Map.entry("tbs", "tbsp"),
            Map.entry("tablespoon", "tbsp"), Map.entry("tablespoons", "tbsp"),
            Map.entry("cup", "cup"), Map.entry("cups", "cup"),
            Map.entry("oz", "oz"), Map.entry("ounce", "oz"), Map.entry("ounces", "oz"),
            Map.entry("floz", "fl oz"), Map.entry("fl-oz", "fl oz"), Map.entry("fluidounce", "fl oz"),
            Map.entry("lb", "lb"), Map.entry("lbs", "lb"), Map.entry("pound", "lb"), Map.entry("pounds", "lb"),
            Map.entry("pint", "pint"), Map.entry("pints", "pint"),
            Map.entry("quart", "quart"), Map.entry("quarts", "quart"),
            Map.entry("gallon", "gallon"), Map.entry("gallons", "gallon"),
            Map.entry("clove", "clove"), Map.entry("cloves", "clove"),
            Map.entry("pinch", "pinch"), Map.entry("pinches", "pinch"),
            Map.entry("dash", "dash"), Map.entry("dashes", "dash"),
            Map.entry("slice", "slice"), Map.entry("slices", "slice"),
            Map.entry("piece", "piece"), Map.entry("pieces", "piece"),
            Map.entry("bunch", "bunch"), Map.entry("bunches", "bunch"),
            Map.entry("sprig", "sprig"), Map.entry("sprigs", "sprig"),
            Map.entry("stick", "stick"), Map.entry("sticks", "stick"),
            Map.entry("can", "can"), Map.entry("cans", "can"),
            Map.entry("package", "package"), Map.entry("packages", "package"), Map.entry("pkg", "package"),
            Map.entry("head", "head"), Map.entry("heads", "head"),
            Map.entry("stalk", "stalk"), Map.entry("stalks", "stalk"),
            Map.entry("handful", "handful"), Map.entry("handfuls", "handful"));

    /** Multi-word units are matched before single tokens so "fl oz" never parses as "fl". */
    private static final Set<String> MULTI_WORD_PREFIXES = Set.of("fl oz", "fluid ounce", "fluid ounces");

    private UnitNormalizer() {
    }

    public static Optional<String> canonical(String rawUnit) {
        if (rawUnit == null || rawUnit.isBlank()) {
            return Optional.empty();
        }
        String key = rawUnit.toLowerCase(Locale.ROOT).replace(".", "").replace(" ", "").trim();
        return Optional.ofNullable(ALIASES.get(key));
    }

    public static boolean isKnownUnit(String token) {
        return canonical(token).isPresent();
    }

    public static Optional<String> matchMultiWordPrefix(String lowerText) {
        return MULTI_WORD_PREFIXES.stream()
                .filter(prefix -> lowerText.startsWith(prefix + " "))
                .findFirst();
    }
}
