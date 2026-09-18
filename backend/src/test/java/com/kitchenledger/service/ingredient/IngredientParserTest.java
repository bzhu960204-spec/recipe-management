package com.kitchenledger.service.ingredient;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class IngredientParserTest {

    private final IngredientParser parser = new IngredientParser();

    private static void assertQuantity(BigDecimal actual, String expected) {
        assertThat(actual).isNotNull();
        assertThat(actual.compareTo(new BigDecimal(expected))).isZero();
    }

    @Test
    @DisplayName("mixed number with unit, note after comma")
    void mixedNumber() {
        ParsedIngredient result = parser.parse("1 1/2 cups all-purpose flour, sifted");

        assertQuantity(result.quantityMin(), "1.5");
        assertThat(result.unit()).isEqualTo("cups");
        assertThat(result.canonicalUnit()).isEqualTo("cup");
        assertThat(result.name()).isEqualTo("all-purpose flour");
        assertThat(result.note()).isEqualTo("sifted");
        assertThat(result.scalable()).isTrue();
    }

    @Test
    @DisplayName("plural unit normalises to canonical token")
    void pluralUnit() {
        ParsedIngredient result = parser.parse("2 tablespoons olive oil");

        assertQuantity(result.quantityMin(), "2");
        assertThat(result.canonicalUnit()).isEqualTo("tbsp");
        assertThat(result.name()).isEqualTo("olive oil");
    }

    @Test
    @DisplayName("vulgar fraction")
    void vulgarFraction() {
        ParsedIngredient result = parser.parse("½ teaspoon salt");

        assertQuantity(result.quantityMin(), "0.5");
        assertThat(result.canonicalUnit()).isEqualTo("tsp");
        assertThat(result.name()).isEqualTo("salt");
    }

    @Test
    @DisplayName("whole number glued to a vulgar fraction")
    void mixedVulgarFraction() {
        ParsedIngredient result = parser.parse("1½ cups water");

        assertQuantity(result.quantityMin(), "1.5");
        assertThat(result.name()).isEqualTo("water");
    }

    @Test
    @DisplayName("dash range keeps both bounds")
    void dashRange() {
        ParsedIngredient result = parser.parse("2-3 cloves garlic, minced");

        assertQuantity(result.quantityMin(), "2");
        assertQuantity(result.quantityMax(), "3");
        assertThat(result.canonicalUnit()).isEqualTo("clove");
        assertThat(result.name()).isEqualTo("garlic");
        assertThat(result.note()).isEqualTo("minced");
    }

    @Test
    @DisplayName("word range keeps both bounds")
    void wordRange() {
        ParsedIngredient result = parser.parse("2 to 3 tablespoons water");

        assertQuantity(result.quantityMin(), "2");
        assertQuantity(result.quantityMax(), "3");
        assertThat(result.name()).isEqualTo("water");
    }

    @Test
    @DisplayName("'to taste' is never scaled")
    void toTasteIsNotScalable() {
        ParsedIngredient result = parser.parse("Salt to taste");

        assertThat(result.quantityMin()).isNull();
        assertThat(result.scalable()).isFalse();
        assertThat(result.name()).isEqualTo("Salt to taste");
    }

    @Test
    @DisplayName("'for frying' is never scaled even with a quantity")
    void forFryingIsNotScalable() {
        ParsedIngredient result = parser.parse("2 cups vegetable oil for frying");

        assertQuantity(result.quantityMin(), "2");
        assertThat(result.scalable()).isFalse();
    }

    @Test
    @DisplayName("count without a unit")
    void countWithoutUnit() {
        ParsedIngredient result = parser.parse("4 chicken thighs");

        assertQuantity(result.quantityMin(), "4");
        assertThat(result.unit()).isNull();
        assertThat(result.name()).isEqualTo("chicken thighs");
    }

    @Test
    @DisplayName("inline parenthetical becomes a note, not part of the name")
    void inlineParenthetical() {
        ParsedIngredient result = parser.parse("1 (14-ounce) can coconut milk");

        assertQuantity(result.quantityMin(), "1");
        assertThat(result.canonicalUnit()).isEqualTo("can");
        assertThat(result.name()).isEqualTo("coconut milk");
        assertThat(result.note()).isEqualTo("14-ounce");
    }

    @Test
    @DisplayName("abbreviation with a trailing dot")
    void abbreviationWithDot() {
        ParsedIngredient result = parser.parse("3 tbsp. butter");

        assertQuantity(result.quantityMin(), "3");
        assertThat(result.canonicalUnit()).isEqualTo("tbsp");
        assertThat(result.name()).isEqualTo("butter");
    }

    @Test
    @DisplayName("simple fraction")
    void simpleFraction() {
        ParsedIngredient result = parser.parse("1/4 cup brown sugar");

        assertQuantity(result.quantityMin(), "0.25");
        assertThat(result.name()).isEqualTo("brown sugar");
    }

    @Test
    @DisplayName("decimal quantity")
    void decimalQuantity() {
        ParsedIngredient result = parser.parse("0.5 cup milk");

        assertQuantity(result.quantityMin(), "0.5");
        assertThat(result.name()).isEqualTo("milk");
    }

    @Test
    @DisplayName("filler word 'of' is dropped from the name")
    void dropsOf() {
        ParsedIngredient result = parser.parse("1 cup of water");

        assertThat(result.name()).isEqualTo("water");
    }

    @Test
    @DisplayName("leading bullet is stripped")
    void stripsBullet() {
        ParsedIngredient result = parser.parse("- 2 eggs");

        assertQuantity(result.quantityMin(), "2");
        assertThat(result.name()).isEqualTo("eggs");
    }

    @Test
    @DisplayName("numbered list prefix is stripped")
    void stripsNumbering() {
        ParsedIngredient result = parser.parse("1. 2 eggs");

        assertQuantity(result.quantityMin(), "2");
        assertThat(result.name()).isEqualTo("eggs");
    }

    @Test
    @DisplayName("trailing 'optional' sets the flag and leaves the name clean")
    void optionalMarker() {
        ParsedIngredient result = parser.parse("Freshly ground black pepper, optional");

        assertThat(result.optional()).isTrue();
        assertThat(result.name()).isEqualTo("Freshly ground black pepper");
    }

    @Test
    @DisplayName("weight in pounds")
    void poundsUnit() {
        ParsedIngredient result = parser.parse("2 lbs boneless skinless chicken thighs");

        assertQuantity(result.quantityMin(), "2");
        assertThat(result.canonicalUnit()).isEqualTo("lb");
        assertThat(result.name()).isEqualTo("boneless skinless chicken thighs");
    }

    @Test
    @DisplayName("preparation note after the comma")
    void preparationNote() {
        ParsedIngredient result = parser.parse("1 tablespoon fresh ginger, grated");

        assertThat(result.name()).isEqualTo("fresh ginger");
        assertThat(result.note()).isEqualTo("grated");
    }

    @Test
    @DisplayName("unparseable text still round-trips through rawText")
    void keepsRawText() {
        ParsedIngredient result = parser.parse("A generous glug of good olive oil");

        assertThat(result.rawText()).isEqualTo("A generous glug of good olive oil");
        assertThat(result.name()).isEqualTo("A generous glug of good olive oil");
        assertThat(result.quantityMin()).isNull();
    }
}
