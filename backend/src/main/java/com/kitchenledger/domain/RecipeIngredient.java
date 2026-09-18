package com.kitchenledger.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "recipe_ingredients")
@Getter
@Setter
@NoArgsConstructor
public class RecipeIngredient {

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

    /** Stable handle a step can point at; survives reordering and editing. */
    @Column(name = "ref_key", length = 64)
    private String refKey;

    @Column(name = "quantity_min", precision = 12, scale = 4)
    private BigDecimal quantityMin;

    @Column(name = "quantity_max", precision = 12, scale = 4)
    private BigDecimal quantityMax;

    @Column(length = 48)
    private String unit;

    @Column(name = "canonical_unit", length = 48)
    private String canonicalUnit;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(length = 255)
    private String note;

    /** Original text as supplied on import; never overwritten, so a bad parse loses nothing. */
    @Column(name = "raw_text", length = 512)
    private String rawText;

    @Column(name = "is_scalable", nullable = false)
    private boolean scalable = true;

    @Column(name = "is_optional", nullable = false)
    private boolean optional = false;
}
