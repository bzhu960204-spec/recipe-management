package com.kitchenledger.service.ingredient;

import java.math.BigDecimal;

/**
 * Result of turning one free-text ingredient line into structured fields.
 * {@code rawText} is always the untouched input so a bad parse never loses information.
 */
public record ParsedIngredient(
        BigDecimal quantityMin,
        BigDecimal quantityMax,
        String unit,
        String canonicalUnit,
        String name,
        String note,
        String rawText,
        boolean scalable,
        boolean optional) {
}
