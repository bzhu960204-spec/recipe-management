-- A version now carries an optional worked example alongside its field definition, so the
-- "what shape do I paste" sample lives apart from the schema instead of buried inside it.
ALTER TABLE template_versions ADD COLUMN example_body CLOB;
