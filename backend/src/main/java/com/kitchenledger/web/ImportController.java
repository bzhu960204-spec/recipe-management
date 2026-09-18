package com.kitchenledger.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.kitchenledger.security.CurrentUser;
import com.kitchenledger.service.ImportService;
import com.kitchenledger.service.RecipeService;
import com.kitchenledger.web.dto.ImportCommitRequest;
import com.kitchenledger.web.dto.ImportPreviewResponse;
import com.kitchenledger.web.dto.RecipeDetailResponse;
import com.kitchenledger.web.error.BadRequestException;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/import")
public class ImportController {

    private final ImportService importService;
    private final RecipeService recipeService;

    public ImportController(ImportService importService, RecipeService recipeService) {
        this.importService = importService;
        this.recipeService = recipeService;
    }

    /** Dry run: parses and reports problems without writing anything. */
    @PostMapping("/preview")
    public ImportPreviewResponse preview(@RequestBody JsonNode payload) {
        return importService.preview(payload);
    }

    @PostMapping("/preview/file")
    public ImportPreviewResponse previewFile(@RequestPart("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Choose a .json file first");
        }
        try {
            String text = new String(file.getBytes(), StandardCharsets.UTF_8);
            return importService.preview(importService.readJson(text));
        } catch (IOException ex) {
            throw new BadRequestException("Could not read the uploaded file");
        }
    }

    @PostMapping("/commit")
    @ResponseStatus(HttpStatus.CREATED)
    public List<RecipeDetailResponse> commit(@Valid @RequestBody ImportCommitRequest request) {
        Long ownerId = CurrentUser.requireId();
        return request.recipes().stream()
                .map(recipe -> recipeService.create(ownerId, recipe))
                .toList();
    }
}
