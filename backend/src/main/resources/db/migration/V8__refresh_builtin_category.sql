-- The built-in formats changed again (tags array -> single category). Drop each user's *unedited*
-- built-in so seedBuiltins() re-creates it from the current classpath on the next list, keeping the
-- classpath the single source of truth. Edited (version > 1) and archived built-ins are preserved.
-- template_versions has ON DELETE CASCADE, so the version rows go with the template.
DELETE FROM templates
 WHERE is_builtin = TRUE
   AND archived = FALSE
   AND current_version_no = 1;
