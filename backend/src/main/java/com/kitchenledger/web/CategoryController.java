package com.kitchenledger.web;

import com.kitchenledger.security.CurrentUser;
import com.kitchenledger.service.CategoryService;
import com.kitchenledger.service.ImageStorageService;
import com.kitchenledger.web.dto.CategoryResponse;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService categoryService;
    private final ImageStorageService imageStorage;

    public CategoryController(CategoryService categoryService, ImageStorageService imageStorage) {
        this.categoryService = categoryService;
        this.imageStorage = imageStorage;
    }

    @GetMapping
    public List<CategoryResponse> list() {
        return categoryService.list(CurrentUser.requireId());
    }

    @PatchMapping("/{id}")
    public CategoryResponse update(@PathVariable Long id, @RequestBody UpdateCategoryRequest request) {
        return categoryService.update(CurrentUser.requireId(), id, request.name(), request.colorToken(), null);
    }

    @PostMapping("/{id}/cover")
    public CategoryResponse uploadCover(@PathVariable Long id, @RequestPart("file") MultipartFile file) {
        Long ownerId = CurrentUser.requireId();
        return categoryService.update(ownerId, id, null, null, imageStorage.store(file));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        categoryService.delete(CurrentUser.requireId(), id);
    }

    public record UpdateCategoryRequest(@Size(max = 80) String name, @Size(max = 32) String colorToken) {
    }
}
