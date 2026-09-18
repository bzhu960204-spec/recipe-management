CREATE TABLE prompt_templates (
    id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_id           BIGINT       NOT NULL,
    name               VARCHAR(120) NOT NULL,
    slug               VARCHAR(120) NOT NULL,
    description        VARCHAR(500),
    -- Points at the published row in prompt_template_versions; editing moves the pointer.
    current_version_no INT          NOT NULL DEFAULT 1,
    is_builtin         BOOLEAN      NOT NULL DEFAULT FALSE,
    archived           BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMP    NOT NULL,
    updated_at         TIMESTAMP    NOT NULL,
    CONSTRAINT fk_prompt_templates_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uk_prompt_templates_owner_slug UNIQUE (owner_id, slug)
);

CREATE INDEX idx_prompt_templates_owner ON prompt_templates (owner_id);

-- Rows here are never updated. Editing a template inserts version_no + 1, so every prompt
-- that ever produced an import stays recoverable byte for byte.
CREATE TABLE prompt_template_versions (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    template_id  BIGINT    NOT NULL,
    version_no   INT       NOT NULL,
    body         CLOB      NOT NULL,
    schema_json  CLOB,
    example_json CLOB,
    changelog    VARCHAR(500),
    created_at   TIMESTAMP NOT NULL,
    CONSTRAINT fk_prompt_versions_template FOREIGN KEY (template_id) REFERENCES prompt_templates (id) ON DELETE CASCADE,
    CONSTRAINT uk_prompt_versions_template_no UNIQUE (template_id, version_no)
);

CREATE INDEX idx_prompt_versions_template ON prompt_template_versions (template_id);
