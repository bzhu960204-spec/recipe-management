package com.kitchenledger.web;

import com.kitchenledger.service.UserService;
import com.kitchenledger.web.dto.CreateUserRequest;
import com.kitchenledger.web.dto.UserResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Registration is closed by design: only an admin can mint accounts. */
@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final UserService userService;

    public AdminUserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public List<UserResponse> list() {
        return userService.listAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(@Valid @RequestBody CreateUserRequest request) {
        return userService.create(request);
    }

    @PostMapping("/{id}/enable")
    public UserResponse enable(@PathVariable Long id) {
        return userService.setEnabled(id, true);
    }

    @PostMapping("/{id}/disable")
    public UserResponse disable(@PathVariable Long id) {
        return userService.setEnabled(id, false);
    }

    @PostMapping("/{id}/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@PathVariable Long id, @Valid @RequestBody ResetPasswordRequest request) {
        userService.resetPassword(id, request.newPassword());
    }

    public record ResetPasswordRequest(@NotBlank @Size(min = 8, max = 128) String newPassword) {
    }
}
