package com.kitchenledger.security;

import com.kitchenledger.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AppUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public AppUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) {
        return userRepository.findByUsernameIgnoreCase(username)
                .map(user -> new AppUserPrincipal(
                        user.getId(), user.getUsername(), user.getPasswordHash(), user.getRole(), user.isEnabled()))
                .orElseThrow(() -> new UsernameNotFoundException("Unknown user"));
    }
}
