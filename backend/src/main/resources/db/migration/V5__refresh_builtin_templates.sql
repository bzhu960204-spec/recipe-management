-- One-time refresh of already-seeded built-in formats to the current shipped shape (trimmed
-- schema + separated example). Rather than embedding the JSON here, drop each user's *unedited*
-- built-in so seedBuiltins() re-creates it from the classpath on the next list — that keeps the
-- classpath the single source of truth. Edited built-ins (more than one version) and archived
-- ones are left untouched so customizations and archive choices survive. The FK on
-- template_versions is ON DELETE CASCADE, so removing the template row drops its version too.
DELETE FROM templates
 WHERE is_builtin = TRUE
   AND archived = FALSE
   AND current_version_no = 1;
