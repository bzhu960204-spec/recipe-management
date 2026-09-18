package com.kitchenledger.service.ingredient;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Turns "1 1/2 cups all-purpose flour, sifted" into quantity / unit / name / note.
 * Deliberately conservative: anything it cannot confidently split stays in {@code name},
 * and the caller can still fall back to {@code rawText}.
 */
@Component
public class IngredientParser {

    private static final Map<Character, BigDecimal> VULGAR_FRACTIONS = Map.ofEntries(
            Map.entry('½', new BigDecimal("0.5")),
            Map.entry('⅓', fraction(1, 3)),
            Map.entry('⅔', fraction(2, 3)),
            Map.entry('¼', new BigDecimal("0.25")),
            Map.entry('¾', new BigDecimal("0.75")),
            Map.entry('⅕', new BigDecimal("0.2")),
            Map.entry('⅖', new BigDecimal("0.4")),
            Map.entry('⅗', new BigDecimal("0.6")),
            Map.entry('⅘', new BigDecimal("0.8")),
            Map.entry('⅙', fraction(1, 6)),
            Map.entry('⅚', fraction(5, 6)),
            Map.entry('⅛', new BigDecimal("0.125")),
            Map.entry('⅜', new BigDecimal("0.375")),
            Map.entry('⅝', new BigDecimal("0.625")),
            Map.entry('⅞', new BigDecimal("0.875")));

    private static final String VULGAR_CLASS = "½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞";

    private static final Pattern LEADING_BULLET = Pattern.compile("^\\s*(?:[-*•‣·]|\\d+[.)])\\s+");

    private static final Pattern QUANTITY = Pattern.compile(
            "^\\s*(?<mixed>\\d+\\s+\\d+\\s*/\\s*\\d+)"
                    + "|^\\s*(?<mixedVulgar>\\d+\\s*[" + VULGAR_CLASS + "])"
                    + "|^\\s*(?<fraction>\\d+\\s*/\\s*\\d+)"
                    + "|^\\s*(?<vulgar>[" + VULGAR_CLASS + "])"
                    + "|^\\s*(?<decimal>\\d+(?:[.,]\\d+)?)");

    private static final Pattern RANGE_SEPARATOR = Pattern.compile("^\\s*(?:-|–|—|~|\\bto\\b|\\bor\\b)\\s*");

    private static final Pattern PARENTHETICAL = Pattern.compile("\\(([^)]*)\\)");

    /** Phrases that make an amount meaningless to scale. */
    private static final Pattern UNSCALABLE = Pattern.compile(
            "\\b(to taste|as needed|as desired|for (?:frying|serving|garnish|greasing|dusting|brushing))\\b",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern OPTIONAL_MARKER = Pattern.compile(
            "\\s*[,(]?\\s*\\boptional\\b\\s*\\)?\\s*$", Pattern.CASE_INSENSITIVE);

    public ParsedIngredient parse(String rawInput) {
        String raw = rawInput == null ? "" : rawInput.trim();
        String working = LEADING_BULLET.matcher(raw).replaceFirst("");

        boolean optional = OPTIONAL_MARKER.matcher(working).find();
        if (optional) {
            working = OPTIONAL_MARKER.matcher(working).replaceAll("").trim();
        }

        String note = null;

        // Parentheticals are asides ("(14-ounce)", "(or more)"), never part of the ingredient name.
        Matcher parens = PARENTHETICAL.matcher(working);
        StringBuilder asides = new StringBuilder();
        while (parens.find()) {
            if (!asides.isEmpty()) {
                asides.append("; ");
            }
            asides.append(parens.group(1).trim());
        }
        if (!asides.isEmpty()) {
            note = asides.toString();
            working = PARENTHETICAL.matcher(working).replaceAll(" ").replaceAll("\\s{2,}", " ").trim();
        }

        BigDecimal quantityMin = null;
        BigDecimal quantityMax = null;

        Matcher quantity = QUANTITY.matcher(working);
        if (quantity.find()) {
            quantityMin = toDecimal(quantity);
            working = working.substring(quantity.end()).trim();

            Matcher separator = RANGE_SEPARATOR.matcher(working);
            if (separator.find()) {
                String afterSeparator = working.substring(separator.end());
                Matcher upper = QUANTITY.matcher(afterSeparator);
                if (upper.find()) {
                    quantityMax = toDecimal(upper);
                    working = afterSeparator.substring(upper.end()).trim();
                }
            }
        }

        String unit = extractUnit(working);
        if (unit != null) {
            working = working.substring(unit.length()).trim();
        }

        working = stripLeadingOf(working);

        // A comma splits the ingredient from its preparation note ("flour, sifted").
        int comma = working.indexOf(',');
        if (comma >= 0) {
            String tail = working.substring(comma + 1).trim();
            String head = working.substring(0, comma).trim();
            if (!head.isEmpty() && !tail.isEmpty()) {
                working = head;
                note = note == null || note.isBlank() ? tail : note + "; " + tail;
            }
        }

        String name = working.trim();
        if (name.isEmpty()) {
            name = raw.isEmpty() ? "Ingredient" : raw;
        }

        boolean scalable = quantityMin != null
                && !UNSCALABLE.matcher(raw).find();

        return new ParsedIngredient(
                quantityMin,
                quantityMax,
                unit,
                unit == null ? null : UnitNormalizer.canonical(unit).orElse(null),
                name,
                note == null || note.isBlank() ? null : note,
                raw,
                scalable,
                optional);
    }

    /**
     * Reads a standalone amount such as "2", "1 1/2" or "2-3".
     * Returns a two-slot array of min and max; either slot may be null.
     */
    public BigDecimal[] parseQuantityRange(String text) {
        BigDecimal[] range = new BigDecimal[2];
        if (text == null || text.isBlank()) {
            return range;
        }

        String working = text.trim();
        Matcher first = QUANTITY.matcher(working);
        if (!first.find()) {
            return range;
        }
        range[0] = toDecimal(first);

        String rest = working.substring(first.end());
        Matcher separator = RANGE_SEPARATOR.matcher(rest);
        if (separator.find()) {
            Matcher second = QUANTITY.matcher(rest.substring(separator.end()));
            if (second.find()) {
                range[1] = toDecimal(second);
            }
        }
        return range;
    }

    private String extractUnit(String text) {        String lower = text.toLowerCase(Locale.ROOT);

        String multiWord = UnitNormalizer.matchMultiWordPrefix(lower).orElse(null);
        if (multiWord != null) {
            return text.substring(0, multiWord.length());
        }

        int end = 0;
        while (end < text.length() && !Character.isWhitespace(text.charAt(end))) {
            end++;
        }
        if (end == 0) {
            return null;
        }
        String token = text.substring(0, end);
        return UnitNormalizer.isKnownUnit(token) ? token : null;
    }

    private String stripLeadingOf(String text) {
        return text.regionMatches(true, 0, "of ", 0, 3) ? text.substring(3).trim() : text;
    }

    private BigDecimal toDecimal(Matcher matcher) {
        String mixed = matcher.group("mixed");
        if (mixed != null) {
            String[] parts = mixed.trim().split("\\s+", 2);
            return new BigDecimal(parts[0]).add(parseFraction(parts[1]));
        }

        String mixedVulgar = matcher.group("mixedVulgar");
        if (mixedVulgar != null) {
            char symbol = mixedVulgar.charAt(mixedVulgar.length() - 1);
            String whole = mixedVulgar.substring(0, mixedVulgar.length() - 1).trim();
            return new BigDecimal(whole).add(VULGAR_FRACTIONS.get(symbol));
        }

        String fraction = matcher.group("fraction");
        if (fraction != null) {
            return parseFraction(fraction);
        }

        String vulgar = matcher.group("vulgar");
        if (vulgar != null) {
            return VULGAR_FRACTIONS.get(vulgar.charAt(0));
        }

        String decimal = matcher.group("decimal");
        return new BigDecimal(decimal.replace(',', '.'));
    }

    private BigDecimal parseFraction(String text) {
        String[] parts = text.split("/", 2);
        return fraction(Integer.parseInt(parts[0].trim()), Integer.parseInt(parts[1].trim()));
    }

    private static BigDecimal fraction(int numerator, int denominator) {
        return BigDecimal.valueOf(numerator)
                .divide(BigDecimal.valueOf(denominator), 4, RoundingMode.HALF_UP)
                .stripTrailingZeros();
    }
}
