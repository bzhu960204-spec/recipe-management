package com.kitchenledger.service;

import com.kitchenledger.domain.Difficulty;
import com.kitchenledger.domain.Recipe;
import com.kitchenledger.domain.RecipeIngredient;
import com.kitchenledger.domain.RecipeStep;
import com.kitchenledger.domain.User;
import com.kitchenledger.repository.RecipeRepository;
import com.kitchenledger.repository.RecipeSpecifications;
import com.kitchenledger.repository.UserRepository;
import com.kitchenledger.service.ingredient.UnitNormalizer;
import com.kitchenledger.web.dto.RecipeDetailResponse;
import com.kitchenledger.web.dto.RecipeSummaryResponse;
import com.kitchenledger.web.dto.RecipeUpsertRequest;
import com.kitchenledger.web.error.NotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
public class RecipeService {

    private final RecipeRepository recipeRepository;
    private final UserRepository userRepository;
    private final CategoryService categoryService;
    private final ImageStorageService imageStorage;
    private final SourceThumbnailService sourceThumbnails;

    public RecipeService(
            RecipeRepository recipeRepository,
            UserRepository userRepository,
            CategoryService categoryService,
            ImageStorageService imageStorage,
            SourceThumbnailService sourceThumbnails) {
        this.recipeRepository = recipeRepository;
        this.userRepository = userRepository;
        this.categoryService = categoryService;
        this.imageStorage = imageStorage;
        this.sourceThumbnails = sourceThumbnails;
    }

    @Transactional(readOnly = true)
    public Page<RecipeSummaryResponse> search(
            Long ownerId,
            String query,
            String categorySlug,
            Boolean favorite,
            Difficulty difficulty,
            Integer maxMinutes,
            Pageable pageable) {

        Specification<Recipe> spec = Specification.where(RecipeSpecifications.ownedBy(ownerId))
                .and(RecipeSpecifications.matchesText(query))
                .and(RecipeSpecifications.hasCategorySlug(categorySlug))
                .and(RecipeSpecifications.favoriteOnly(favorite))
                .and(RecipeSpecifications.hasDifficulty(difficulty))
                .and(RecipeSpecifications.maxTotalMinutes(maxMinutes));

        return recipeRepository.findAll(spec, pageable).map(RecipeSummaryResponse::from);
    }

    @Transactional(readOnly = true)
    public RecipeDetailResponse get(Long ownerId, Long recipeId) {
        return RecipeDetailResponse.from(require(ownerId, recipeId));
    }

    @Transactional
    public RecipeDetailResponse create(Long ownerId, RecipeUpsertRequest request) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        Recipe recipe = new Recipe();
        recipe.setOwner(owner);
        apply(recipe, request, ownerId);
        return RecipeDetailResponse.from(recipeRepository.save(recipe));
    }

    @Transactional
    public RecipeDetailResponse update(Long ownerId, Long recipeId, RecipeUpsertRequest request) {
        Recipe recipe = require(ownerId, recipeId);

        String previousImageKey = recipe.getImageKey();
        apply(recipe, request, ownerId);
        if (previousImageKey != null && !previousImageKey.equals(recipe.getImageKey())) {
            imageStorage.deleteQuietly(previousImageKey);
        }
        // Flush so the replaced ingredients get their ids before we read them for step.usedIngredientIds.
        return RecipeDetailResponse.from(recipeRepository.saveAndFlush(recipe));
    }

    @Transactional
    public void delete(Long ownerId, Long recipeId) {
        Recipe recipe = require(ownerId, recipeId);
        String imageKey = recipe.getImageKey();
        recipeRepository.delete(recipe);
        imageStorage.deleteQuietly(imageKey);
    }

    @Transactional
    public RecipeDetailResponse setFavorite(Long ownerId, Long recipeId, boolean favorite) {
        Recipe recipe = require(ownerId, recipeId);
        recipe.setFavorite(favorite);
        return RecipeDetailResponse.from(recipe);
    }

    @Transactional
    public RecipeDetailResponse setNotes(Long ownerId, Long recipeId, String notes) {
        Recipe recipe = require(ownerId, recipeId);
        recipe.setPersonalNotes(notes);
        return RecipeDetailResponse.from(recipe);
    }

    @Transactional
    public RecipeDetailResponse setImageKey(Long ownerId, Long recipeId, String imageKey) {
        Recipe recipe = require(ownerId, recipeId);
        String previous = recipe.getImageKey();
        recipe.setImageKey(imageKey);
        if (previous != null && !previous.equals(imageKey)) {
            imageStorage.deleteQuietly(previous);
        }
        return RecipeDetailResponse.from(recipe);
    }

    /** Downloads the recipe's source-link thumbnail (YouTube) and stores it as the uploaded cover. */
    @Transactional
    public RecipeDetailResponse setImageFromSource(Long ownerId, Long recipeId) {
        Recipe recipe = require(ownerId, recipeId);
        byte[] thumbnail = sourceThumbnails.fetchYouTubeThumbnail(recipe.getSourceUrl());
        String key = imageStorage.store(thumbnail);
        String previous = recipe.getImageKey();
        recipe.setImageKey(key);
        if (previous != null && !previous.equals(key)) {
            imageStorage.deleteQuietly(previous);
        }
        return RecipeDetailResponse.from(recipe);
    }

    private Recipe require(Long ownerId, Long recipeId) {
        // Scoping by owner here (not in the controller) is what makes cross-account access impossible.
        return recipeRepository.findByIdAndOwnerId(recipeId, ownerId)
                .orElseThrow(() -> new NotFoundException("Recipe not found"));
    }

    private void apply(Recipe recipe, RecipeUpsertRequest request, Long ownerId) {
        recipe.setTitle(request.title().trim());
        recipe.setDescription(blankToNull(request.description()));
        recipe.setImageUrl(blankToNull(request.imageUrl()));
        recipe.setImageKey(blankToNull(request.imageKey()));
        recipe.setDifficulty(request.difficulty());
        recipe.setPersonalNotes(blankToNull(request.notes()));
        if (request.favorite() != null) {
            recipe.setFavorite(request.favorite());
        }
        if (request.importPayload() != null) {
            recipe.setImportPayload(request.importPayload());
        }

        Optional.ofNullable(request.source()).ifPresentOrElse(source -> {
            recipe.setSourceUrl(blankToNull(source.url()));
            recipe.setSourceName(blankToNull(source.name()));
            recipe.setSourceType(source.type());
        }, () -> {
            recipe.setSourceUrl(null);
            recipe.setSourceName(null);
            recipe.setSourceType(null);
        });

        Optional.ofNullable(request.servings()).ifPresentOrElse(servings -> {
            recipe.setBaseServings(servings.amount());
            recipe.setServingUnit(blankToNull(servings.unit()));
        }, () -> {
            recipe.setBaseServings(null);
            recipe.setServingUnit(null);
        });

        applyTimes(recipe, request.times());

        recipe.setCategory(categoryService.resolveOrCreate(ownerId, request.category()));

        applyIngredientsAndSteps(recipe, request);
    }

    private void applyTimes(Recipe recipe, RecipeUpsertRequest.TimesInput times) {
        if (times == null) {
            recipe.setPrepMinutes(null);
            recipe.setCookMinutes(null);
            recipe.setTotalMinutes(null);
            return;
        }
        recipe.setPrepMinutes(times.prepMinutes());
        recipe.setCookMinutes(times.cookMinutes());

        Integer total = times.totalMinutes();
        if (total == null && (times.prepMinutes() != null || times.cookMinutes() != null)) {
            total = orZero(times.prepMinutes()) + orZero(times.cookMinutes());
        }
        recipe.setTotalMinutes(total);
    }

    private void applyIngredientsAndSteps(Recipe recipe, RecipeUpsertRequest request) {
        List<RecipeIngredient> ingredients = new ArrayList<>();
        Map<String, RecipeIngredient> byRef = new LinkedHashMap<>();
        Map<String, RecipeIngredient> byName = new LinkedHashMap<>();

        List<RecipeUpsertRequest.IngredientInput> ingredientInputs =
                request.ingredients() == null ? List.of() : request.ingredients();

        int order = 0;
        for (RecipeUpsertRequest.IngredientInput input : ingredientInputs) {
            RecipeIngredient ingredient = new RecipeIngredient();
            ingredient.setSortOrder(order++);
            ingredient.setSection(blankToNull(input.section()));
            ingredient.setQuantityMin(input.quantity());
            ingredient.setQuantityMax(input.quantityMax());
            ingredient.setUnit(blankToNull(input.unit()));
            ingredient.setCanonicalUnit(UnitNormalizer.canonical(input.unit()).orElse(null));
            ingredient.setName(input.name().trim());
            ingredient.setNote(blankToNull(input.note()));
            ingredient.setRawText(blankToNull(input.rawText()));
            ingredient.setScalable(input.scalable() == null ? input.quantity() != null : input.scalable());
            ingredient.setOptional(Boolean.TRUE.equals(input.optional()));

            String ref = blankToNull(input.ref()) == null
                    ? Slugs.of(ingredient.getName())
                    : input.ref().trim();
            ingredient.setRefKey(uniqueRef(byRef, ref));

            ingredients.add(ingredient);
            byRef.put(ingredient.getRefKey(), ingredient);
            byName.putIfAbsent(ingredient.getName().toLowerCase(Locale.ROOT), ingredient);
        }
        recipe.replaceIngredients(ingredients);

        List<RecipeUpsertRequest.StepInput> stepInputs = request.steps() == null ? List.of() : request.steps();
        List<RecipeStep> steps = new ArrayList<>();

        order = 0;
        for (RecipeUpsertRequest.StepInput input : stepInputs) {
            RecipeStep step = new RecipeStep();
            step.setSortOrder(order++);
            step.setSection(blankToNull(input.section()));
            step.setTitle(blankToNull(input.title()));
            step.setInstruction(input.instruction().trim());
            step.setDurationSeconds(input.durationSeconds());
            step.setTemperatureC(input.temperatureC());
            step.setImageUrl(blankToNull(input.imageUrl()));

            if (input.uses() != null) {
                for (String reference : input.uses()) {
                    resolveReference(reference, byRef, byName).ifPresent(step.getUsedIngredients()::add);
                }
            }
            steps.add(step);
        }
        recipe.replaceSteps(steps);
    }

    /** Refs win; falling back to the ingredient name keeps looser LLM output usable. */
    private Optional<RecipeIngredient> resolveReference(
            String reference, Map<String, RecipeIngredient> byRef, Map<String, RecipeIngredient> byName) {
        if (reference == null || reference.isBlank()) {
            return Optional.empty();
        }
        String key = reference.trim();
        RecipeIngredient match = byRef.get(key);
        if (match == null) {
            match = byName.get(key.toLowerCase(Locale.ROOT));
        }
        if (match == null) {
            match = byRef.get(Slugs.of(key));
        }
        return Optional.ofNullable(match);
    }

    private String uniqueRef(Map<String, RecipeIngredient> taken, String candidate) {
        String ref = candidate;
        int suffix = 2;
        while (taken.containsKey(ref)) {
            ref = candidate + "-" + suffix++;
        }
        return ref;
    }

    private static int orZero(Integer value) {
        return value == null ? 0 : value;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
