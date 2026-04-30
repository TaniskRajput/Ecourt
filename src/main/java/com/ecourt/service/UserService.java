package com.ecourt.service;

import com.ecourt.dto.RegisterCompleteRequest;
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
        String username = normalizeUsername(request.getUsername());
        String email = normalizeEmail(request.getEmail());
        String password = validatePassword(request.getPassword());
        String role = normalizeSelfServiceRole(request.getRole());

        assertUserDoesNotExist(username, email);

        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        user.setEmail(email);
        user.setEmailVerified(true);
        user.setRole(role);
        user.setActive(true);
        user.setAuthProvider("LOCAL");
        applyRegistrationProfile(user, request);
        userRepository.save(user);

        return "User registered successfully";
    }

    public User createManagedUser(String username, String email, String password, String role) {
        String normalizedUsername = normalizeUsername(username);
        String normalizedEmail = normalizeEmail(email);
        String normalizedPassword = validatePassword(password);
        String normalizedRole = normalizeAdminManagedRole(role);

        assertUserDoesNotExist(normalizedUsername, normalizedEmail);

        User user = new User();
        user.setUsername(normalizedUsername);
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(normalizedPassword));
        user.setEmailVerified(true);
        user.setRole(normalizedRole);
        user.setActive(true);
        user.setAuthProvider("LOCAL");
        return userRepository.save(user);
    }

    public User createVerifiedUser(
            String username,
            String email,
            String password,
            String role,
            String authProvider,
            String googleSubject) {
        String normalizedUsername = normalizeUsername(username);
        String normalizedEmail = normalizeEmail(email);
        String normalizedRole = normalizeRole(role);
        assertUserDoesNotExist(normalizedUsername, normalizedEmail);

        User user = new User();
        user.setUsername(normalizedUsername);
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(password));
        user.setEmailVerified(true);
        user.setRole(normalizedRole);
        user.setActive(true);
        user.setAuthProvider(authProvider);
        user.setGoogleSubject(googleSubject);
        return userRepository.save(user);
    }

    public User createVerifiedUser(RegisterCompleteRequest request, String authProvider, String googleSubject) {
        String normalizedUsername = normalizeUsername(request.getUsername());
        String normalizedEmail = normalizeEmail(request.getEmail());
        String normalizedRole = normalizeRole(request.getRole());
        assertUserDoesNotExist(normalizedUsername, normalizedEmail);

        User user = new User();
        user.setUsername(normalizedUsername);
        user.setEmail(normalizedEmail);
        user.setPassword(encodePassword(request.getPassword()));
        user.setEmailVerified(true);
        user.setRole(normalizedRole);
        user.setActive(true);
        user.setAuthProvider(authProvider);
        user.setGoogleSubject(googleSubject);
        applyRegistrationProfile(user, request);
        return userRepository.save(user);
    }

    public User authenticateForLogin(String usernameOrEmail, String rawPassword) {
        String normalized = normalizeRequired(usernameOrEmail, "Email or username is required");
        User user = userRepository.findByUsernameIgnoreCaseOrEmailIgnoreCase(normalized, normalized)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bad credentials"));

        if (!user.isActive() || !user.isEmailVerified()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bad credentials");
        }

        if (!passwordEncoder.matches(rawPassword, user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bad credentials");
        }

        return user;
    }

    public String normalizeUsername(String username) {
        return normalizeRequired(username, "Username is required");
    }

    public String normalizeEmail(String email) {
        return normalizeRequired(email, "Email is required").toLowerCase(Locale.ROOT);
    }

    public String normalizeSelfServiceRole(String role) {
        String normalizedRole = normalizeRole(role);
        if (!SELF_SERVICE_ROLES.contains(normalizedRole)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Self-registration only supports CLIENT or LAWYER accounts.");
        }
        return normalizedRole;
    }

    public String normalizeAdminManagedRole(String role) {
        String normalizedRole = normalizeRole(role);
        if (!ADMIN_MANAGED_ROLES.contains(normalizedRole)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Role must be one of CLIENT, LAWYER, ADMIN, or JUDGE.");
        }
        return normalizedRole;
    }

    public String validateAndConfirmPassword(String password, String confirmPassword) {
        String validatedPassword = validatePassword(password);
        if (confirmPassword == null || !validatedPassword.equals(confirmPassword)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password and confirm password must match.");
        }
        return validatedPassword;
    }

    public String encodePassword(String password) {
        return passwordEncoder.encode(validatePassword(password));
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
                    "Password must be at least 8 characters and include both letters and numbers.");
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

    private void applyRegistrationProfile(User user, RegisterRequest request) {
        user.setFullName(normalizeOptional(request.getFullName()));
        user.setMobileNumber(normalizeOptional(request.getMobileNumber()));
        user.setAadhaarLast4(normalizeOptional(request.getAadhaarLast4()));
        user.setState(normalizeOptional(request.getState()));
        user.setDistrict(normalizeOptional(request.getDistrict()));
        user.setPreferredCourt(normalizeOptional(request.getPreferredCourt()));
        user.setAddress(normalizeOptional(request.getAddress()));
        user.setBarCouncilId(normalizeOptional(request.getBarCouncilId()));
        user.setEnrollmentNumber(normalizeOptional(request.getEnrollmentNumber()));
        user.setPracticeArea(normalizeOptional(request.getPracticeArea()));
        user.setIdProofType(normalizeOptional(request.getIdProofType()));
    }

    private void applyRegistrationProfile(User user, RegisterCompleteRequest request) {
        user.setFullName(normalizeOptional(request.getFullName()));
        user.setMobileNumber(normalizeOptional(request.getMobileNumber()));
        user.setAadhaarLast4(normalizeOptional(request.getAadhaarLast4()));
        user.setState(normalizeOptional(request.getState()));
        user.setDistrict(normalizeOptional(request.getDistrict()));
        user.setPreferredCourt(normalizeOptional(request.getPreferredCourt()));
        user.setAddress(normalizeOptional(request.getAddress()));
        user.setBarCouncilId(normalizeOptional(request.getBarCouncilId()));
        user.setEnrollmentNumber(normalizeOptional(request.getEnrollmentNumber()));
        user.setPracticeArea(normalizeOptional(request.getPracticeArea()));
        user.setIdProofType(normalizeOptional(request.getIdProofType()));
    }

    private String normalizeOptional(String value) {
        return value == null || value.trim().isEmpty() ? null : value.trim();
    }

    public com.ecourt.dto.UserProfileResponse getUserProfile(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return new com.ecourt.dto.UserProfileResponse(
                user.getUsername(), user.getEmail(), user.getRole(),
                user.getFullName(), user.getMobileNumber(), user.getAddress(), user.getAadhaarLast4()
        );
    }

    public com.ecourt.dto.UserProfileResponse updateUserProfile(String currentUsername, String newUsername, com.ecourt.dto.UserProfileUpdateRequest request) {
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        
        if (newUsername != null && !newUsername.trim().isEmpty() && !newUsername.equalsIgnoreCase(currentUsername)) {
            if (userRepository.existsByUsername(newUsername.trim())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already taken");
            }
            user.setUsername(newUsername.trim());
        }

        if (request.getFullName() != null) user.setFullName(request.getFullName().trim());
        if (request.getMobileNumber() != null) user.setMobileNumber(request.getMobileNumber().trim());
        if (request.getAddress() != null) user.setAddress(request.getAddress().trim());
        if (request.getAadhaarLast4() != null) user.setAadhaarLast4(request.getAadhaarLast4().trim());
        
        userRepository.save(user);
        
        return new com.ecourt.dto.UserProfileResponse(
                user.getUsername(), user.getEmail(), user.getRole(),
                user.getFullName(), user.getMobileNumber(), user.getAddress(), user.getAadhaarLast4()
        );
    }
}
