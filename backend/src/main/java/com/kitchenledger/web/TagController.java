package com.kitchenledger.web;

import com.kitchenledger.security.CurrentUser;
import com.kitchenledger.service.ImageStorageService;
import com.kitchenledger.service.TagService;
import com.kitchenledger.web.dto.TagResponse;
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
@RequestMapping("/api/tags")
public class TagController {

    private final TagService tagService;
    private final ImageStorageService imageStorage;

    public TagController(TagService tagService, ImageStorageService imageStorage) {
        this.tagService = tagService;
        this.imageStorage = imageStorage;
    }

    @GetMapping
    public List<TagResponse> list() {
        return tagService.list(CurrentUser.requireId());
    }

    @PatchMapping("/{id}")
    public TagResponse update(@PathVariable Long id, @RequestBody UpdateTagRequest request) {
        return tagService.update(CurrentUser.requireId(), id, request.name(), request.colorToken(), null);
    }

    @PostMapping("/{id}/cover")
    public TagResponse uploadCover(@PathVariable Long id, @RequestPart("file") MultipartFile file) {
        Long ownerId = CurrentUser.requireId();
        return tagService.update(ownerId, id, null, null, imageStorage.store(file));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        tagService.delete(CurrentUser.requireId(), id);
    }

    public record UpdateTagRequest(@Size(max = 80) String name, @Size(max = 32) String colorToken) {
    }
}
