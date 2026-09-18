package com.kitchenledger.service;

import com.kitchenledger.domain.Role;
import com.kitchenledger.domain.User;
import com.kitchenledger.repository.UserRepository;
import com.kitchenledger.web.dto.ChangePasswordRequest;
import com.kitchenledger.web.dto.CreateUserRequest;
import com.kitchenledger.web.dto.UpdatePreferencesRequest;
import com.kitchenledger.web.dto.UserResponse;
import com.kitchenledger.web.error.BadRequestException;
import com.kitchenledger.web.error.NotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public UserResponse currentUser(Long userId) {
        return UserResponse.from(load(userId));
    }

    @Transactional(readOnly = true)
    public List<UserResponse> listAll() {
        return userRepository.findAll().stream()
                .sorted(Comparator.comparing(User::getId))
                .map(UserResponse::from)
                .toList();
    }

    @Transactional
    public UserResponse create(CreateUserRequest request) {
        if (userRepository.existsByUsernameIgnoreCase(request.username())) {
            throw new BadRequestException("Username is already taken");
        }

        User user = new User();
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setDisplayName(request.displayName() == null ? request.username() : request.displayName());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(request.role() == null ? Role.USER : request.role());
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public UserResponse setEnabled(Long userId, boolean enabled) {
        User user = load(userId);
        if (!enabled && user.getRole() == Role.ADMIN && countEnabledAdmins() <= 1) {
            throw new BadRequestException("Cannot disable the last remaining admin");
        }
        user.setEnabled(enabled);
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse updatePreferences(Long userId, UpdatePreferencesRequest request) {
        User user = load(userId);
        if (request.displayName() != null) {
            user.setDisplayName(request.displayName());
        }
        if (request.themeId() != null) {
            user.setThemeId(request.themeId());
        }
        if (request.themeMode() != null) {
            user.setThemeMode(request.themeMode());
        }
        return UserResponse.from(user);
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = load(userId);
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
    }

    @Transactional
    public void resetPassword(Long userId, String newPassword) {
        load(userId).setPasswordHash(passwordEncoder.encode(newPassword));
    }

    private long countEnabledAdmins() {
        return userRepository.findAll().stream()
                .filter(candidate -> candidate.getRole() == Role.ADMIN && candidate.isEnabled())
                .count();
    }

    private User load(Long userId) {
        return userRepository.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));
    }
}
