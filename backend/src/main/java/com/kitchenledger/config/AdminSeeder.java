package com.kitchenledger.config;

import com.kitchenledger.domain.Role;
import com.kitchenledger.domain.User;
import com.kitchenledger.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AdminSeeder {

    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

    @Bean
    public ApplicationRunner seedAdmin(
            UserRepository userRepository, PasswordEncoder passwordEncoder, AppProperties properties) {
        return args -> {
            AppProperties.Admin admin = properties.admin();
            if (userRepository.existsByUsernameIgnoreCase(admin.username())) {
                return;
            }

            User user = new User();
            user.setUsername(admin.username());
            user.setDisplayName(admin.displayName());
            user.setPasswordHash(passwordEncoder.encode(admin.password()));
            user.setRole(Role.ADMIN);
            userRepository.save(user);

            log.warn("Seeded admin account '{}'. Change the password before exposing this app.", admin.username());
        };
    }
}
