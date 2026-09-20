package com.kitchenledger.service;

import com.kitchenledger.domain.Category;
import com.kitchenledger.domain.User;
import com.kitchenledger.repository.CategoryRepository;
import com.kitchenledger.repository.UserRepository;
import com.kitchenledger.web.dto.CategoryResponse;
import com.kitchenledger.web.error.BadRequestException;
import com.kitchenledger.web.error.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    public CategoryService(CategoryRepository categoryRepository, UserRepository userRepository) {
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> list(Long ownerId) {
        Map<Long, Long> counts = categoryRepository.countRecipesByCategory(ownerId).stream()
                .collect(Collectors.toMap(
                        CategoryRepository.CategoryCount::getCategoryId,
                        CategoryRepository.CategoryCount::getRecipeCount));

        return categoryRepository.findByOwnerIdOrderBySortOrderAscNameAsc(ownerId).stream()
                .map(category -> CategoryResponse.from(category, counts.getOrDefault(category.getId(), 0L)))
                .toList();
    }

    @Transactional
    public CategoryResponse update(Long ownerId, Long categoryId, String name, String colorToken, String coverImageKey) {
        Category category = categoryRepository.findByIdAndOwnerId(categoryId, ownerId)
                .orElseThrow(() -> new NotFoundException("Category not found"));

        if (name != null && !name.isBlank()) {
            String slug = Slugs.of(name);
            categoryRepository.findByOwnerIdAndSlug(ownerId, slug)
                    .filter(existing -> !existing.getId().equals(categoryId))
                    .ifPresent(existing -> {
                        throw new BadRequestException("Another category already uses that name");
                    });
            category.setName(name.trim());
            category.setSlug(slug);
        }
        if (colorToken != null) {
            category.setColorToken(colorToken.isBlank() ? null : colorToken);
        }
        if (coverImageKey != null) {
            category.setCoverImageKey(coverImageKey.isBlank() ? null : coverImageKey);
        }
        return CategoryResponse.from(category, 0L);
    }

    @Transactional
    public void delete(Long ownerId, Long categoryId) {
        Category category = categoryRepository.findByIdAndOwnerId(categoryId, ownerId)
                .orElseThrow(() -> new NotFoundException("Category not found"));
        categoryRepository.delete(category);
    }

    /**
     * Resolves a single category name to this owner's category, creating it if it does not exist yet.
     * A blank or null name means "uncategorised" and returns {@code null}.
     */
    @Transactional
    public Category resolveOrCreate(Long ownerId, String name) {
        if (name == null || name.isBlank()) {
            return null;
        }

        String trimmed = name.trim();
        String slug = Slugs.of(trimmed);
        return categoryRepository.findByOwnerIdAndSlug(ownerId, slug)
                .orElseGet(() -> {
                    User owner = userRepository.findById(ownerId)
                            .orElseThrow(() -> new NotFoundException("User not found"));
                    Category category = new Category();
                    category.setOwner(owner);
                    category.setName(trimmed);
                    category.setSlug(slug);
                    return categoryRepository.save(category);
                });
    }
}
