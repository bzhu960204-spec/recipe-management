package com.kitchenledger.web;

import com.kitchenledger.security.CurrentUser;
import com.kitchenledger.service.TemplateService;
import com.kitchenledger.web.dto.TemplateResponse;
import com.kitchenledger.web.dto.TemplateSummaryResponse;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/templates")
public class TemplateController {

    private final TemplateService templateService;

    public TemplateController(TemplateService templateService) {
        this.templateService = templateService;
    }

    @GetMapping
    public List<TemplateSummaryResponse> list() {
        return templateService.list(CurrentUser.requireId());
    }

    @GetMapping("/{id}")
    public TemplateResponse get(@PathVariable Long id, @RequestParam(required = false) Integer version) {
        return templateService.get(CurrentUser.requireId(), id, version);
    }

    @PostMapping
    public TemplateResponse create(@RequestBody SaveTemplateRequest request) {
        return templateService.create(
                CurrentUser.requireId(), request.name(), request.description(), request.toInput());
    }

    @PostMapping("/{id}/versions")
    public TemplateResponse addVersion(@PathVariable Long id, @RequestBody SaveVersionRequest request) {
        return templateService.addVersion(
                CurrentUser.requireId(), id, request.toInput(), request.changelog());
    }

    @PostMapping("/{id}/versions/{versionNo}/restore")
    public TemplateResponse restore(@PathVariable Long id, @PathVariable int versionNo) {
        return templateService.restore(CurrentUser.requireId(), id, versionNo);
    }

    @PatchMapping("/{id}")
    public TemplateResponse update(@PathVariable Long id, @RequestBody UpdateTemplateRequest request) {
        return templateService.update(
                CurrentUser.requireId(), id, request.name(), request.description(), request.archived());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        templateService.delete(CurrentUser.requireId(), id);
    }

    public record SaveTemplateRequest(
            @Size(max = 120) String name,
            @Size(max = 500) String description,
            String schema,
            String example) {

        TemplateService.VersionInput toInput() {
            return new TemplateService.VersionInput(schema, example);
        }
    }

    public record SaveVersionRequest(
            String schema,
            String example,
            @Size(max = 500) String changelog) {

        TemplateService.VersionInput toInput() {
            return new TemplateService.VersionInput(schema, example);
        }
    }

    public record UpdateTemplateRequest(
            @Size(max = 120) String name,
            @Size(max = 500) String description,
            Boolean archived) {
    }
}
