package com.kitchenledger.service;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

public final class Slugs {

    private static final Pattern NON_ALNUM = Pattern.compile("[^a-z0-9]+");
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
