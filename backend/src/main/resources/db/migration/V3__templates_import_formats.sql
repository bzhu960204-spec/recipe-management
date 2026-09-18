-- The prompt library became a general import-format library: one format text per version,
-- named "schema". The old prompt body and example JSON are folded away.

-- Keep whatever each version actually documented: prefer its schema, fall back to the prompt.
UPDATE prompt_template_versions
   SET schema_json = body
 WHERE schema_json IS NULL;

ALTER TABLE prompt_template_versions ALTER COLUMN schema_json RENAME TO schema_body;
ALTER TABLE prompt_template_versions ALTER COLUMN schema_body SET NOT NULL;
ALTER TABLE prompt_template_versions DROP COLUMN body;
ALTER TABLE prompt_template_versions DROP COLUMN example_json;

ALTER TABLE prompt_templates RENAME TO templates;
ALTER TABLE prompt_template_versions RENAME TO template_versions;
