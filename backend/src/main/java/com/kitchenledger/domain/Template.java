package com.kitchenledger.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * A named, reusable import-data format used somewhere in the app (recipe JSON, the flat
 * ingredient list, …). The format text itself lives in {@link TemplateVersion}; this row only
 * names the template and points at the published version.
 */
@Entity
@Table(name = "templates", uniqueConstraints = @UniqueConstraint(columnNames = {"owner_id", "slug"}))
@Getter
@Setter
@NoArgsConstructor
public class Template {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, length = 120)
    private String slug;

    @Column(length = 500)
    private String description;

    @Column(name = "current_version_no", nullable = false)
    private int currentVersionNo = 1;

    /** Seeded from the classpath. Reseeding skips owners who already have it, so edits survive. */
    @Column(name = "is_builtin", nullable = false)
    private boolean builtin = false;

    @Column(nullable = false)
    private boolean archived = false;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
