package com.kitchenledger.web;

import com.kitchenledger.domain.Difficulty;
import com.kitchenledger.security.CurrentUser;
import com.kitchenledger.service.ImageStorageService;
import com.kitchenledger.service.RecipeService;
import com.kitchenledger.web.dto.RecipeDetailResponse;
import com.kitchenledger.web.dto.RecipeSummaryResponse;
import com.kitchenledger.web.dto.RecipeUpsertRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/recipes")
public class RecipeController {

    private static final int MAX_PAGE_SIZE = 200;

    private final RecipeService recipeService;
    private final ImageStorageService imageStorage;

    public RecipeController(RecipeService recipeService, ImageStorageService imageStorage) {
        this.recipeService = recipeService;
        this.imageStorage = imageStorage;
    }

    @GetMapping
    public Page<RecipeSummaryResponse> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) Boolean favorite,
            @RequestParam(required = false) Difficulty difficulty,
            @RequestParam(required = false) Integer maxMinutes,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(defaultValue = "updatedAt,desc") String sort) {

        return recipeService.search(
                CurrentUser.requireId(), q, tag, favorite, difficulty, maxMinutes,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE), parseSort(sort)));
    }

    @GetMapping("/{id}")
    public RecipeDetailResponse get(@PathVariable Long id) {
        return recipeService.get(CurrentUser.requireId(), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RecipeDetailResponse create(@Valid @RequestBody RecipeUpsertRequest request) {
        return recipeService.create(CurrentUser.requireId(), request);
    }

    @PutMapping("/{id}")
    public RecipeDetailResponse update(@PathVariable Long id, @Valid @RequestBody RecipeUpsertRequest request) {
        return recipeService.update(CurrentUser.requireId(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        recipeService.delete(CurrentUser.requireId(), id);
    }

    @PutMapping("/{id}/favorite")
    public RecipeDetailResponse setFavorite(@PathVariable Long id, @RequestBody FavoriteRequest request) {
        return recipeService.setFavorite(CurrentUser.requireId(), id, request.favorite());
    }

    @PutMapping("/{id}/notes")
    public RecipeDetailResponse setNotes(@PathVariable Long id, @RequestBody NotesRequest request) {
        return recipeService.setNotes(CurrentUser.requireId(), id, request.notes());
    }

    @PostMapping("/{id}/image")
    public RecipeDetailResponse uploadImage(@PathVariable Long id, @RequestPart("file") MultipartFile file) {
        Long ownerId = CurrentUser.requireId();
        // Confirm ownership before writing anything to disk.
        recipeService.get(ownerId, id);
        return recipeService.setImageKey(ownerId, id, imageStorage.store(file));
    }

    @DeleteMapping("/{id}/image")
    public RecipeDetailResponse removeImage(@PathVariable Long id) {
        return recipeService.setImageKey(CurrentUser.requireId(), id, null);
    }

    private Sort parseSort(String sort) {
        String[] parts = sort.split(",", 2);
        String property = switch (parts[0]) {
            case "title", "totalMinutes", "createdAt" -> parts[0];
            default -> "updatedAt";
        };
        Sort.Direction direction = parts.length > 1 && parts[1].equalsIgnoreCase("asc")
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        return Sort.by(direction, property);
    }

    public record FavoriteRequest(boolean favorite) {
    }

    public record NotesRequest(String notes) {
    }
}
