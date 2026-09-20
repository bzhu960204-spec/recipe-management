package com.kitchenledger.service;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

public final class Slugs {

    // Keep Unicode letters/digits (incl. CJK) so distinct non-ASCII names don't collapse to one slug.
    private static final Pattern NON_ALNUM = Pattern.compile("[^\\p{IsAlphabetic}\\p{IsDigit}]+");
    private static final Pattern EDGE_DASHES = Pattern.compile("(^-|-$)");

    private Slugs() {
    }

    public static String of(String value) {
        String normalized = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
        String slug = EDGE_DASHES.matcher(NON_ALNUM.matcher(normalized).replaceAll("-")).replaceAll("");
        return slug.isBlank() ? "item" : slug;
    }
}
