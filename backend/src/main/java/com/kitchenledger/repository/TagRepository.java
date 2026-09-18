package com.kitchenledger.repository;

import com.kitchenledger.domain.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TagRepository extends JpaRepository<Tag, Long> {

    List<Tag> findByOwnerIdOrderBySortOrderAscNameAsc(Long ownerId);

    Optional<Tag> findByOwnerIdAndSlug(Long ownerId, String slug);

    Optional<Tag> findByIdAndOwnerId(Long id, Long ownerId);

    /** Tags with no recipes are absent from the result; callers default them to zero. */
    @Query("""
            select t.id as tagId, count(r.id) as recipeCount
            from Recipe r join r.tags t
            where r.owner.id = :ownerId
            group by t.id
            """)
    List<TagCount> countRecipesByTag(@Param("ownerId") Long ownerId);

    interface TagCount {
        Long getTagId();

        long getRecipeCount();
    }
}
