package com.kitchenledger.web;

import com.kitchenledger.service.AppSettingService;
import com.kitchenledger.service.SourceThumbnailService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Admin-only runtime settings. Gated by SecurityConfig's /api/admin/** -> ADMIN rule. */
@RestController
@RequestMapping("/api/admin/settings")
public class AdminSettingController {

    private final AppSettingService settings;
    private final SourceThumbnailService thumbnails;

    public AdminSettingController(AppSettingService settings, SourceThumbnailService thumbnails) {
        this.settings = settings;
        this.thumbnails = thumbnails;
    }

    @GetMapping("/proxy")
    public ProxyResponse getProxy() {
        return ProxyResponse.parse(settings.get(SourceThumbnailService.PROXY_SETTING_KEY).orElse(null));
    }

    @PutMapping("/proxy")
    public ProxyResponse setProxy(@Valid @RequestBody ProxyRequest request) {
        settings.put(SourceThumbnailService.PROXY_SETTING_KEY, request.toValue());
        return ProxyResponse.parse(request.toValue());
    }

    @PostMapping("/proxy/test")
    public SourceThumbnailService.TestResult testProxy(@Valid @RequestBody ProxyRequest request) {
        return thumbnails.testProxy(request.host(), request.port());
    }

    public record ProxyRequest(
            @Size(max = 255) String host,
            @Min(1) @Max(65535) Integer port) {

        /** Combines the fields into the stored "host:port", or null when either is missing (= direct). */
        String toValue() {
            if (host == null || host.isBlank() || port == null) {
                return null;
            }
            return host.trim() + ":" + port;
        }
    }

    public record ProxyResponse(String host, Integer port) {

        static ProxyResponse parse(String value) {
            if (value == null || value.isBlank()) {
                return new ProxyResponse(null, null);
            }
            int colon = value.lastIndexOf(':');
            if (colon <= 0) {
                return new ProxyResponse(value, null);
            }
            Integer port = null;
            try {
                port = Integer.valueOf(value.substring(colon + 1).trim());
            } catch (NumberFormatException ignored) {
                // A malformed stored value degrades to "host only"; the admin can re-save it.
            }
            return new ProxyResponse(value.substring(0, colon), port);
        }
    }
}
