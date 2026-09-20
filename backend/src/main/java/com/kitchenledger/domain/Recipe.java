package com.kitchenledger.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "recipes")
@Getter
@Setter
@NoArgsConstructor
public class Recipe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(nullable = false, length = 255)
    private String title;

    @Lob
    private String description;

    @Column(name = "source_url", length = 2048)
    private String sourceUrl;

    @Column(name = "source_name", length = 255)
    private String sourceName;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", length = 16)
    private SourceType sourceType;

    @Column(name = "image_url", length = 2048)
    private String imageUrl;

    @Column(name = "image_key", length = 160)
    private String imageKey;

    @Column(name = "base_servings", precision = 12, scale = 4)
    private BigDecimal baseServings;

    @Column(name = "serving_unit", length = 64)
    private String servingUnit;

    @Column(name = "prep_minutes")
    private Integer prepMinutes;

    @Column(name = "cook_minutes")
    private Integer cookMinutes;

    @Column(name = "total_minutes")
    private Integer totalMinutes;

    @Enumerated(EnumType.STRING)
    @Column(length = 16)
    private Difficulty difficulty;

    @Column(nullable = false)
    private boolean favorite = false;

    @Lob
    @Column(name = "personal_notes")
    private String personalNotes;

    @Lob
    @Column(name = "import_payload")
    private String importPayload;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "recipe", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC, id ASC")
    private List<RecipeIngredient> ingredients = new ArrayList<>();

    @OneToMany(mappedBy = "recipe", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC, id ASC")
    private List<RecipeStep> steps = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

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

    public void replaceIngredients(List<RecipeIngredient> replacements) {
        ingredients.clear();
        replacements.forEach(this::addIngredient);
    }

    public void addIngredient(RecipeIngredient ingredient) {
        ingredient.setRecipe(this);
        ingredients.add(ingredient);
    }

    public void replaceSteps(List<RecipeStep> replacements) {
        steps.clear();
        replacements.forEach(this::addStep);
    }

    public void addStep(RecipeStep step) {
        step.setRecipe(this);
        steps.add(step);
    }
}
