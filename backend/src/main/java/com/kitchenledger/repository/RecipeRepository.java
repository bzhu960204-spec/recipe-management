package com.kitchenledger.repository;

import com.kitchenledger.domain.Recipe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface RecipeRepository extends JpaRepository<Recipe, Long>, JpaSpecificationExecutor<Recipe> {

    Optional<Recipe> findByIdAndOwnerId(Long id, Long ownerId);

    boolean existsByIdAndOwnerId(Long id, Long ownerId);
}
