package com.kitchenledger.service;

import com.kitchenledger.domain.Tag;
import com.kitchenledger.domain.User;
import com.kitchenledger.repository.TagRepository;
import com.kitchenledger.repository.UserRepository;
import com.kitchenledger.web.dto.TagResponse;
import com.kitchenledger.web.error.BadRequestException;
import com.kitchenledger.web.error.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class TagService {

    private final TagRepository tagRepository;
    private final UserRepository userRepository;

    public TagService(TagRepository tagRepository, UserRepository userRepository) {
        this.tagRepository = tagRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<TagResponse> list(Long ownerId) {
        Map<Long, Long> counts = tagRepository.countRecipesByTag(ownerId).stream()
                .collect(Collectors.toMap(TagRepository.TagCount::getTagId, TagRepository.TagCount::getRecipeCount));

        return tagRepository.findByOwnerIdOrderBySortOrderAscNameAsc(ownerId).stream()
                .map(tag -> TagResponse.from(tag, counts.getOrDefault(tag.getId(), 0L)))
                .toList();
    }

    @Transactional
    public TagResponse update(Long ownerId, Long tagId, String name, String colorToken, String coverImageKey) {
        Tag tag = tagRepository.findByIdAndOwnerId(tagId, ownerId)
                .orElseThrow(() -> new NotFoundException("Tag not found"));

        if (name != null && !name.isBlank()) {
            String slug = Slugs.of(name);
            tagRepository.findByOwnerIdAndSlug(ownerId, slug)
                    .filter(existing -> !existing.getId().equals(tagId))
                    .ifPresent(existing -> {
                        throw new BadRequestException("Another tag already uses that name");
                    });
            tag.setName(name.trim());
            tag.setSlug(slug);
        }
        if (colorToken != null) {
            tag.setColorToken(colorToken.isBlank() ? null : colorToken);
        }
        if (coverImageKey != null) {
            tag.setCoverImageKey(coverImageKey.isBlank() ? null : coverImageKey);
        }
        return TagResponse.from(tag, 0L);
    }

    @Transactional
    public void delete(Long ownerId, Long tagId) {
        Tag tag = tagRepository.findByIdAndOwnerId(tagId, ownerId)
                .orElseThrow(() -> new NotFoundException("Tag not found"));
        tagRepository.delete(tag);
    }

    /** Resolves tag names to this owner's tags, creating any that do not exist yet. */
    @Transactional
    public Set<Tag> resolveOrCreate(Long ownerId, Collection<String> names) {
        if (names == null || names.isEmpty()) {
            return Set.of();
        }

        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        // Deduplicate by slug so "Poultry" and "poultry" collapse into one tag.
        Map<String, String> bySlug = names.stream()
                .filter(name -> name != null && !name.isBlank())
                .map(String::trim)
                .collect(Collectors.toMap(Slugs::of, Function.identity(), (first, second) -> first));

        Set<Tag> resolved = new LinkedHashSet<>();
        bySlug.forEach((slug, name) -> resolved.add(tagRepository.findByOwnerIdAndSlug(ownerId, slug)
                .orElseGet(() -> {
                    Tag tag = new Tag();
                    tag.setOwner(owner);
                    tag.setName(name);
                    tag.setSlug(slug);
                    return tagRepository.save(tag);
                })));
        return resolved;
    }
}
