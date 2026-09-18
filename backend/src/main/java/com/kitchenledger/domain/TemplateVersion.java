package com.kitchenledger.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * One immutable snapshot of a format. Nothing ever updates a row here: saving an edit
 * inserts the next {@code versionNo}, which is what makes "restore v2" exact rather than
 * a best-effort reconstruction.
 */
@Entity
@Table(name = "template_versions",
        uniqueConstraints = @UniqueConstraint(columnNames = {"template_id", "version_no"}))
@Getter
@Setter
@NoArgsConstructor
public class TemplateVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "template_id", nullable = false)
    private Template template;

    @Column(name = "version_no", nullable = false)
    private int versionNo;

    /** The format definition itself: a JSON schema, a flat-file spec, or free notes. */
    @Lob
    @Column(name = "schema_body", nullable = false)
    private String schema;

    /** An optional worked sample of the format, kept apart from the definition above. */
    @Lob
    @Column(name = "example_body")
    private String example;

    @Column(length = 500)
    private String changelog;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
    }
}
