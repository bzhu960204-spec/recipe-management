-- Generic key/value store for runtime-editable settings an admin can change without a restart
-- (first use: the outbound HTTP proxy for fetching video cover thumbnails). KEY/VALUE are H2
-- reserved words, hence the setting_ prefixes.
CREATE TABLE app_settings (
    setting_key   VARCHAR(64)  NOT NULL PRIMARY KEY,
    setting_value VARCHAR(512),
    updated_at    TIMESTAMP    NOT NULL
);
