package com.kitchenledger.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "recipe_steps")
@Getter
@Setter
@NoArgsConstructor
public class RecipeStep {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "recipe_id", nullable = false)
    private Recipe recipe;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(length = 120)
    private String section;

    @Column(length = 255)
    private String title;

    @Lob
    @Column(nullable = false)
    private String instruction;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "temperature_c", precision = 8, scale = 2)
    private BigDecimal temperatureC;

    @Column(name = "image_url", length = 2048)
    private String imageUrl;

    @Column(name = "image_key", length = 160)
    private String imageKey;

    /** Drives the inline scaled amounts shown next to this step in Cook Mode. */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "step_ingredients",
            joinColumns = @JoinColumn(name = "step_id"),
            inverseJoinColumns = @JoinColumn(name = "ingredient_id"))
    private Set<RecipeIngredient> usedIngredients = new LinkedHashSet<>();
}
