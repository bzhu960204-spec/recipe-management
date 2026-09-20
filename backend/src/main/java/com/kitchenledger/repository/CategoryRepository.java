package com.kitchenledger.repository;

import com.kitchenledger.domain.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    List<Category> findByOwnerIdOrderBySortOrderAscNameAsc(Long ownerId);

    Optional<Category> findByOwnerIdAndSlug(Long ownerId, String slug);

    Optional<Category> findByIdAndOwnerId(Long id, Long ownerId);

    /** Categories with no recipes are absent from the result; callers default them to zero. */
    @Query("""
            select r.category.id as categoryId, count(r.id) as recipeCount
            from Recipe r
            where r.owner.id = :ownerId and r.category is not null
            group by r.category.id
            """)
    List<CategoryCount> countRecipesByCategory(@Param("ownerId") Long ownerId);

    interface CategoryCount {
        Long getCategoryId();

        long getRecipeCount();
    }
}
