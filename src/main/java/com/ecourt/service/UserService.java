package com.ecourt.service;

import com.ecourt.dto.RegisterRequest;
import com.ecourt.model.User;
import com.ecourt.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.Set;

@Service
public class UserService {

    private static final Set<String> SELF_SERVICE_ROLES = Set.of("CLIENT", "LAWYER");
    private static final Set<String> ADMIN_MANAGED_ROLES = Set.of("CLIENT", "LAWYER", "ADMIN", "JUDGE");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public String register(RegisterRequest request) {
        String username = normalizeRequired(request.getUsername(), "Username is required");
        String email = normalizeRequired(request.getEmail(), "Email is required").toLowerCase(Locale.ROOT);
        String password = validatePassword(request.getPassword());
        String role = normalizeRole(request.getRole());

        if (!SELF_SERVICE_ROLES.contains(role)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Self-registration only supports CLIENT or LAWYER accounts."
            );
        }

        if (userRepository.findByUsername(username).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
        }

        if (userRepository.findByEmail(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        }

        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        user.setEmail(email);
        user.setRole(role);
        user.setActive(true);

        userRepository.save(user);

        return "User registered successfully";
    }

    public User createManagedUser(String username, String email, String password, String role) {
        String normalizedUsername = normalizeRequired(username, "Username is required");
        String normalizedEmail = normalizeRequired(email, "Email is required").toLowerCase(Locale.ROOT);
        String normalizedPassword = validatePassword(password);
        String normalizedRole = normalizeAdminManagedRole(role);

        assertUserDoesNotExist(normalizedUsername, normalizedEmail);

        User user = new User();
        user.setUsername(normalizedUsername);
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(normalizedPassword));
        user.setRole(normalizedRole);
        user.setActive(true);
        return userRepository.save(user);
    }

    public String normalizeAdminManagedRole(String role) {
        String normalizedRole = normalizeRole(role);
        if (!ADMIN_MANAGED_ROLES.contains(normalizedRole)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Role must be one of CLIENT, LAWYER, ADMIN, or JUDGE."
            );
        }
        return normalizedRole;
    }

    private void assertUserDoesNotExist(String username, String email) {
        if (userRepository.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
        }

        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        }
    }

    private String validatePassword(String password) {
        if (password == null || password.length() < 8
                || password.chars().noneMatch(Character::isLetter)
                || password.chars().noneMatch(Character::isDigit)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Password must be at least 8 characters and include both letters and numbers."
            );
        }
        return password;
    }

    private String normalizeRequired(String value, String message) {
        if (value == null || value.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return value.trim();
    }

    private String normalizeRole(String role) {
        if (role == null || role.trim().isEmpty()) {
            return "CLIENT";
        }
        return role.trim().toUpperCase(Locale.ROOT);
    }
}
