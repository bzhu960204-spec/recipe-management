CREATE TABLE users (
    id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
    username              VARCHAR(64)  NOT NULL,
    email                 VARCHAR(255),
    password_hash         VARCHAR(255) NOT NULL,
    display_name          VARCHAR(128),
    role                  VARCHAR(16)  NOT NULL DEFAULT 'USER',
    theme_id              VARCHAR(32)  NOT NULL DEFAULT 'fresh',
    theme_mode            VARCHAR(8)   NOT NULL DEFAULT 'light',
    enabled               BOOLEAN      NOT NULL DEFAULT TRUE,
    failed_login_attempts INT          NOT NULL DEFAULT 0,
    locked_until          TIMESTAMP,
    created_at            TIMESTAMP    NOT NULL,
    updated_at            TIMESTAMP    NOT NULL,
    CONSTRAINT uk_users_username UNIQUE (username)
);

CREATE TABLE tags (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_id        BIGINT       NOT NULL,
    name            VARCHAR(80)  NOT NULL,
    slug            VARCHAR(80)  NOT NULL,
    color_token     VARCHAR(32),
    cover_image_key VARCHAR(160),
    sort_order      INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL,
    CONSTRAINT fk_tags_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uk_tags_owner_slug UNIQUE (owner_id, slug)
);

CREATE TABLE recipes (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_id       BIGINT        NOT NULL,
    title          VARCHAR(255)  NOT NULL,
    description    CLOB,
    source_url     VARCHAR(2048),
    source_name    VARCHAR(255),
    source_type    VARCHAR(16),
    image_url      VARCHAR(2048),
    image_key      VARCHAR(160),
    base_servings  DECIMAL(12, 4),
    serving_unit   VARCHAR(64),
    prep_minutes   INT,
    cook_minutes   INT,
    total_minutes  INT,
    difficulty     VARCHAR(16),
    favorite       BOOLEAN       NOT NULL DEFAULT FALSE,
    personal_notes CLOB,
    -- Verbatim copy of the import JSON: lets new fields be back-filled without re-importing.
    import_payload CLOB,
    created_at     TIMESTAMP     NOT NULL,
    updated_at     TIMESTAMP     NOT NULL,
    CONSTRAINT fk_recipes_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_recipes_owner ON recipes (owner_id);
CREATE INDEX idx_recipes_owner_favorite ON recipes (owner_id, favorite);

CREATE TABLE recipe_tags (
    recipe_id BIGINT NOT NULL,
    tag_id    BIGINT NOT NULL,
    PRIMARY KEY (recipe_id, tag_id),
    CONSTRAINT fk_recipe_tags_recipe FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE,
    CONSTRAINT fk_recipe_tags_tag FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
);

CREATE INDEX idx_recipe_tags_tag ON recipe_tags (tag_id);

CREATE TABLE recipe_ingredients (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    recipe_id      BIGINT         NOT NULL,
    sort_order     INT            NOT NULL DEFAULT 0,
    section        VARCHAR(120),
    -- Stable key used by steps to reference this ingredient; survives reordering.
    ref_key        VARCHAR(64),
    quantity_min   DECIMAL(12, 4),
    quantity_max   DECIMAL(12, 4),
    unit           VARCHAR(48),
    canonical_unit VARCHAR(48),
    name           VARCHAR(255)   NOT NULL,
    note           VARCHAR(255),
    raw_text       VARCHAR(512),
    is_scalable    BOOLEAN        NOT NULL DEFAULT TRUE,
    is_optional    BOOLEAN        NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_ingredients_recipe FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE
);

CREATE INDEX idx_ingredients_recipe ON recipe_ingredients (recipe_id);
CREATE INDEX idx_ingredients_name ON recipe_ingredients (name);

CREATE TABLE recipe_steps (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    recipe_id        BIGINT       NOT NULL,
    sort_order       INT          NOT NULL DEFAULT 0,
    section          VARCHAR(120),
    title            VARCHAR(255),
    instruction      CLOB         NOT NULL,
    duration_seconds INT,
    temperature_c    DECIMAL(8, 2),
    image_url        VARCHAR(2048),
    image_key        VARCHAR(160),
    CONSTRAINT fk_steps_recipe FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE
);

CREATE INDEX idx_steps_recipe ON recipe_steps (recipe_id);

CREATE TABLE step_ingredients (
    step_id       BIGINT NOT NULL,
    ingredient_id BIGINT NOT NULL,
    PRIMARY KEY (step_id, ingredient_id),
    CONSTRAINT fk_step_ingredients_step FOREIGN KEY (step_id) REFERENCES recipe_steps (id) ON DELETE CASCADE,
    CONSTRAINT fk_step_ingredients_ingredient FOREIGN KEY (ingredient_id) REFERENCES recipe_ingredients (id) ON DELETE CASCADE
);
