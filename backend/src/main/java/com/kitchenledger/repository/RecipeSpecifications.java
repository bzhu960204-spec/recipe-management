package com.kitchenledger.repository;

import com.kitchenledger.domain.Difficulty;
import com.kitchenledger.domain.Recipe;
import com.kitchenledger.domain.RecipeIngredient;
import com.kitchenledger.domain.Tag;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.util.Locale;

public final class RecipeSpecifications {

    private RecipeSpecifications() {
    }

    public static Specification<Recipe> ownedBy(Long ownerId) {
        return (root, query, cb) -> cb.equal(root.get("owner").get("id"), ownerId);
    }

    /**
     * Matches the title, the description or any ingredient name.
     * Uses EXISTS rather than a join so a recipe never appears twice in the result page.
     */
    public static Specification<Recipe> matchesText(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        String pattern = "%" + text.trim().toLowerCase(Locale.ROOT) + "%";
        return (root, query, cb) -> {
            Subquery<Long> ingredientMatch = query.subquery(Long.class);
            var ingredient = ingredientMatch.from(RecipeIngredient.class);
            ingredientMatch.select(cb.literal(1L))
                    .where(cb.and(
                            cb.equal(ingredient.get("recipe"), root),
                            cb.like(cb.lower(ingredient.get("name")), pattern)));

            return cb.or(
                    cb.like(cb.lower(root.get("title")), pattern),
                    cb.like(cb.lower(cb.coalesce(root.get("sourceName"), "")), pattern),
                    cb.exists(ingredientMatch));
        };
    }

    public static Specification<Recipe> hasTagSlug(String slug) {
        if (slug == null || slug.isBlank()) {
            return null;
        }
        return (root, query, cb) -> {
            Join<Recipe, Tag> tags = root.join("tags");
            return cb.equal(tags.get("slug"), slug);
        };
    }

    public static Specification<Recipe> favoriteOnly(Boolean favorite) {
        if (favorite == null || !favorite) {
            return null;
        }
        return (root, query, cb) -> cb.isTrue(root.get("favorite"));
    }

    public static Specification<Recipe> hasDifficulty(Difficulty difficulty) {
        if (difficulty == null) {
            return null;
        }
        return (root, query, cb) -> cb.equal(root.get("difficulty"), difficulty);
    }

    public static Specification<Recipe> maxTotalMinutes(Integer maxMinutes) {
        if (maxMinutes == null) {
            return null;
        }
        return (root, query, cb) -> cb.and(
                cb.isNotNull(root.get("totalMinutes")),
                cb.lessThanOrEqualTo(root.get("totalMinutes"), maxMinutes));
    }
}
