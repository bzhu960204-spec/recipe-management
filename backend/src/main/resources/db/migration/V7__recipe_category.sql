-- Recipes now belong to at most one category (was many-to-many tags).
-- Rename the tags table to categories and replace the join table with a nullable FK.

ALTER TABLE tags RENAME TO categories;

ALTER TABLE recipes ADD COLUMN category_id BIGINT;

-- Collapse each recipe's tags to a single category: keep the earliest-created one, drop the rest.
UPDATE recipes SET category_id = (
    SELECT MIN(rt.tag_id) FROM recipe_tags rt WHERE rt.recipe_id = recipes.id
);

ALTER TABLE recipes
    ADD CONSTRAINT fk_recipes_category FOREIGN KEY (category_id)
    REFERENCES categories (id) ON DELETE SET NULL;

CREATE INDEX idx_recipes_category ON recipes (category_id);

DROP TABLE recipe_tags;
