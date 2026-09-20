package com.kitchenledger.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** A single runtime-editable setting, keyed by a stable string (e.g. "thumbnail.proxy"). */
@Entity
@Table(name = "app_settings")
@Getter
@Setter
@NoArgsConstructor
public class AppSetting {

    @Id
    @Column(name = "setting_key", nullable = false, length = 64)
    private String key;

    @Column(name = "setting_value", length = 512)
    private String value;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public AppSetting(String key) {
        this.key = key;
    }

    @PrePersist
    @PreUpdate
    void touch() {
        this.updatedAt = Instant.now();
    }
}
