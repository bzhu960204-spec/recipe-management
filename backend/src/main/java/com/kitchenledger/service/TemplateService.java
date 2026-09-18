package com.kitchenledger.service;

import com.kitchenledger.domain.Template;
import com.kitchenledger.domain.TemplateVersion;
import com.kitchenledger.domain.User;
import com.kitchenledger.repository.TemplateRepository;
import com.kitchenledger.repository.TemplateVersionRepository;
import com.kitchenledger.repository.UserRepository;
import com.kitchenledger.web.dto.TemplateResponse;
import com.kitchenledger.web.dto.TemplateSummaryResponse;
import com.kitchenledger.web.dto.TemplateVersionResponse;
import com.kitchenledger.web.error.BadRequestException;
import com.kitchenledger.web.error.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TemplateService {

    private final TemplateRepository templateRepository;
    private final TemplateVersionRepository versionRepository;
    private final UserRepository userRepository;
    private final BuiltinTemplate builtin;

    public TemplateService(
            TemplateRepository templateRepository,
            TemplateVersionRepository versionRepository,
            UserRepository userRepository,
            BuiltinTemplate builtin) {
        this.templateRepository = templateRepository;
        this.versionRepository = versionRepository;
        this.userRepository = userRepository;
        this.builtin = builtin;
    }

    @Transactional
    public List<TemplateSummaryResponse> list(Long ownerId) {
        seedBuiltins(ownerId);
        return templateRepository.findByOwnerIdOrderByNameAsc(ownerId).stream()
                .map(template -> TemplateSummaryResponse.from(
                        template, versionRepository.countByTemplateId(template.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public TemplateResponse get(Long ownerId, Long id, Integer versionNo) {
        Template template = require(ownerId, id);
        int wanted = versionNo == null ? template.getCurrentVersionNo() : versionNo;
        return TemplateResponse.of(
                template,
                TemplateVersionResponse.from(requireVersion(template, wanted)),
                historyOf(template));
    }

    @Transactional
    public TemplateResponse create(Long ownerId, String name, String description, VersionInput input) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        Template template = new Template();
        template.setOwner(owner);
        template.setName(requireName(name));
        template.setSlug(uniqueSlug(ownerId, name, null));
        template.setDescription(trimToNull(description));
        template.setCurrentVersionNo(1);
        templateRepository.save(template);

        TemplateVersion version = writeVersion(template, 1, input, "Created");
        return TemplateResponse.of(
                template, TemplateVersionResponse.from(version), historyOf(template));
    }

    /** Saving an edit never rewrites history: it appends the next version and republishes. */
    @Transactional
    public TemplateResponse addVersion(Long ownerId, Long id, VersionInput input, String changelog) {
        Template template = require(ownerId, id);
        int next = template.getCurrentVersionNo() + 1;

        TemplateVersion version = writeVersion(template, next, input, changelog);
        template.setCurrentVersionNo(next);

        return TemplateResponse.of(
                template, TemplateVersionResponse.from(version), historyOf(template));
    }

    /** Restoring copies the old text forward rather than moving the pointer back, so nothing is lost. */
    @Transactional
    public TemplateResponse restore(Long ownerId, Long id, int versionNo) {
        Template template = require(ownerId, id);
        TemplateVersion source = requireVersion(template, versionNo);
        if (versionNo == template.getCurrentVersionNo()) {
            throw new BadRequestException("That version is already the current one");
        }

        return addVersion(ownerId, id, new VersionInput(source.getSchema(), source.getExample()),
                "Restored v" + versionNo);
    }

    @Transactional
    public TemplateResponse update(Long ownerId, Long id, String name, String description, Boolean archived) {
        Template template = require(ownerId, id);

        if (name != null && !name.isBlank()) {
            template.setName(name.trim());
            template.setSlug(uniqueSlug(ownerId, name, id));
        }
        if (description != null) {
            template.setDescription(trimToNull(description));
        }
        if (archived != null) {
            template.setArchived(archived);
        }

        return TemplateResponse.of(
                template,
                TemplateVersionResponse.from(requireVersion(template, template.getCurrentVersionNo())),
                historyOf(template));
    }

    @Transactional
    public void delete(Long ownerId, Long id) {
        Template template = require(ownerId, id);
        if (template.isBuiltin()) {
            // Deleting it would only bring it back on the next seed; archiving is the honest verb.
            throw new BadRequestException("A built-in template cannot be deleted. Archive it instead.");
        }
        templateRepository.delete(template);
    }

    private void seedBuiltins(Long ownerId) {
        User owner = null;
        for (BuiltinTemplate.Definition definition : builtin.all()) {
            if (templateRepository.findByOwnerIdAndSlug(ownerId, definition.slug()).isPresent()) {
                continue;
            }
            if (owner == null) {
                owner = userRepository.findById(ownerId)
                        .orElseThrow(() -> new NotFoundException("User not found"));
            }

            Template template = new Template();
            template.setOwner(owner);
            template.setName(definition.name());
            template.setSlug(uniqueSlug(ownerId, definition.slug(), null));
            template.setDescription(definition.description());
            template.setBuiltin(true);
            template.setCurrentVersionNo(1);
            templateRepository.save(template);

            writeVersion(
                    template, 1,
                    new VersionInput(definition.schema(), definition.example()),
                    "Shipped with Kitchen Ledger");
        }
    }

    private TemplateVersion writeVersion(
            Template template, int versionNo, VersionInput input, String changelog) {
        if (input == null || input.schema() == null || input.schema().isBlank()) {
            throw new BadRequestException("The schema cannot be empty");
        }

        TemplateVersion version = new TemplateVersion();
        version.setTemplate(template);
        version.setVersionNo(versionNo);
        version.setSchema(input.schema());
        version.setExample(trimToNull(input.example()));
        version.setChangelog(trimToNull(changelog));
        return versionRepository.save(version);
    }

    private List<TemplateVersionResponse> historyOf(Template template) {
        return versionRepository.findByTemplateIdOrderByVersionNoDesc(template.getId()).stream()
                .map(TemplateVersionResponse::meta)
                .toList();
    }

    private Template require(Long ownerId, Long id) {
        return templateRepository.findByIdAndOwnerId(id, ownerId)
                .orElseThrow(() -> new NotFoundException("Template not found"));
    }

    private TemplateVersion requireVersion(Template template, int versionNo) {
        return versionRepository.findByTemplateIdAndVersionNo(template.getId(), versionNo)
                .orElseThrow(() -> new NotFoundException("Version not found"));
    }

    private String requireName(String name) {
        if (name == null || name.isBlank()) {
            throw new BadRequestException("Give the template a name");
        }
        return name.trim();
    }

    /**
     * {@code Slugs.of} collapses every non-ASCII name to the same value, so a numeric suffix is
     * what keeps two Chinese-named templates from colliding on the unique index.
     */
    private String uniqueSlug(Long ownerId, String name, Long selfId) {
        String base = Slugs.of(name);
        String candidate = base;
        int suffix = 1;
        while (templateRepository.findByOwnerIdAndSlug(ownerId, candidate)
                .filter(existing -> !existing.getId().equals(selfId))
                .isPresent()) {
            suffix++;
            candidate = base + "-" + suffix;
        }
        return candidate;
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public record VersionInput(String schema, String example) {
    }
}
