package com.kitchenledger.repository;

import com.kitchenledger.domain.Template;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TemplateRepository extends JpaRepository<Template, Long> {

    List<Template> findByOwnerIdOrderByNameAsc(Long ownerId);

    Optional<Template> findByIdAndOwnerId(Long id, Long ownerId);

    Optional<Template> findByOwnerIdAndSlug(Long ownerId, String slug);

    boolean existsByOwnerIdAndBuiltinTrue(Long ownerId);
}
