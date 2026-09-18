package com.kitchenledger.web.dto;

import com.kitchenledger.domain.Template;

import java.time.Instant;

public record TemplateSummaryResponse(
        Long id,
        String name,
        String slug,
        String description,
        int currentVersionNo,
        boolean builtin,
        boolean archived,
        long versionCount,
        Instant updatedAt) {

    public static TemplateSummaryResponse from(Template template, long versionCount) {
        return new TemplateSummaryResponse(
                template.getId(),
                template.getName(),
                template.getSlug(),
                template.getDescription(),
                template.getCurrentVersionNo(),
                template.isBuiltin(),
                template.isArchived(),
                versionCount,
                template.getUpdatedAt());
    }
}
