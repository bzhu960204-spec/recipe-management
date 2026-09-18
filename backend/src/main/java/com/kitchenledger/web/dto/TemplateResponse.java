package com.kitchenledger.web.dto;

import com.kitchenledger.domain.Template;

import java.time.Instant;
import java.util.List;

/**
 * Template detail. {@code version} carries the full text of one version — the published one
 * by default, or an older one when the user is browsing history — while {@code versions}
 * is the text-free index used to render that history.
 */
public record TemplateResponse(
        Long id,
        String name,
        String slug,
        String description,
        int currentVersionNo,
        boolean builtin,
        boolean archived,
        Instant updatedAt,
        TemplateVersionResponse version,
        List<TemplateVersionResponse> versions) {

    public static TemplateResponse of(
            Template template,
            TemplateVersionResponse version,
            List<TemplateVersionResponse> versions) {
        return new TemplateResponse(
                template.getId(),
                template.getName(),
                template.getSlug(),
                template.getDescription(),
                template.getCurrentVersionNo(),
                template.isBuiltin(),
                template.isArchived(),
                template.getUpdatedAt(),
                version,
                versions);
    }
}
