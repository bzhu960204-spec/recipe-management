package com.kitchenledger.repository;

import com.kitchenledger.domain.TemplateVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TemplateVersionRepository extends JpaRepository<TemplateVersion, Long> {

    List<TemplateVersion> findByTemplateIdOrderByVersionNoDesc(Long templateId);

    Optional<TemplateVersion> findByTemplateIdAndVersionNo(Long templateId, int versionNo);

    long countByTemplateId(Long templateId);
}
