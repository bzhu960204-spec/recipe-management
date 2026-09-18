package com.kitchenledger.web;

import com.kitchenledger.service.ImageStorageService;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping("/api/images")
public class ImageController {

    private final ImageStorageService imageStorage;

    public ImageController(ImageStorageService imageStorage) {
        this.imageStorage = imageStorage;
    }

    @GetMapping("/{prefix}/{name}")
    public ResponseEntity<Resource> get(@PathVariable String prefix, @PathVariable String name) {
        String key = prefix + "/" + name;
        Resource resource = new FileSystemResource(imageStorage.load(key));

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(imageStorage.contentType(key)))
                // Content is immutable per key, but never let a browser sniff it into something executable.
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .header("X-Content-Type-Options", "nosniff")
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePrivate())
                .body(resource);
    }
}
