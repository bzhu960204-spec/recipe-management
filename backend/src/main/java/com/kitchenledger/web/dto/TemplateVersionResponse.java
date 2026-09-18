package com.kitchenledger.web.dto;

import com.kitchenledger.domain.TemplateVersion;

import java.time.Instant;

/**
 * One immutable format snapshot. {@link #meta} drops the text so the history list stays
 * small; Jackson omits the nulls, leaving just the version number, changelog and date.
 */
public record TemplateVersionResponse(
        int versionNo,
        String schema,
        String example,
        String changelog,
        Instant createdAt) {

    public static TemplateVersionResponse from(TemplateVersion version) {
        return new TemplateVersionResponse(
                version.getVersionNo(),
                version.getSchema(),
                version.getExample(),
                version.getChangelog(),
                version.getCreatedAt());
    }

    public static TemplateVersionResponse meta(TemplateVersion version) {
        return new TemplateVersionResponse(
                version.getVersionNo(), null, null, version.getChangelog(), version.getCreatedAt());
    }
}
