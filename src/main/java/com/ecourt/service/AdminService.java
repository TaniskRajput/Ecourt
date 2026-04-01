package com.ecourt.service;

import com.ecourt.dto.AdminCreateUserRequest;
import com.ecourt.dto.UserListResponse;
import com.ecourt.dto.UserSummaryResponse;
import com.ecourt.model.User;
import com.ecourt.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.domain.Sort;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

/**
 * Business Logic Service for Administrator Operations.
 * 
 * WHY IT IS USED:
 * This service isolates the complex business rules required for administering
 * the platform.
 * Instead of muddying the controller with database logic, this file uses JPA
 * CriteriaBuilder
 * to dynamically generate SQL queries based on the admin's search parameters.
 * It also enforces
 * critical security features, such as preventing administrators from
 * accidentally demoting or
 * deactivating their own accounts.
 *
 * FUNCTIONS OVERVIEW:
 * - getUsers: Dynamically builds a database query based on role/status filters
 * and returns a secure, paginated DTO.
 * - createUser: Provisions a new system user directly securely.
 * - updateUserRole: Reassigns a user's permission level while blocking
 * self-demotion.
 * - updateUserStatus: Activates or suspends a user gracefully.
 * - validatePage / validateSize: Ensures pagination limits cannot be abused to
 * crash the database.
 */
@Service
public class AdminService {

    private final UserRepository userRepository;
    private final UserService userService;
    private final NotificationService notificationService;

    public AdminService(UserRepository userRepository, UserService userService, NotificationService notificationService) {
        this.userRepository = userRepository;
        this.userService = userService;
        this.notificationService = notificationService;
    }

    public UserListResponse getUsers(String role, Boolean active, String query, int page, int size) {
        Pageable pageable = PageRequest.of(validatePage(page), validateSize(size), Sort.by(Sort.Direction.DESC, "id"));
        Page<UserSummaryResponse> result = userRepository.findAll((root, criteriaQuery, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (role != null && !role.trim().isEmpty()) {
                predicates.add(criteriaBuilder.equal(
                        criteriaBuilder.upper(root.get("role")),
                        role.trim().toUpperCase(Locale.ROOT)));
            }

            if (active != null) {
                predicates.add(criteriaBuilder.equal(root.get("active"), active));
            }

            if (query != null && !query.trim().isEmpty()) {
                String pattern = "%" + query.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("username")), pattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("email")), pattern)));
            }

            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        }, pageable)
                .map(UserSummaryResponse::from);

        return new UserListResponse(
                result.getContent(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages());
    }

    public UserSummaryResponse createUser(AdminCreateUserRequest request) {
        User createdUser = userService.createManagedUser(
                request.getUsername(),
                request.getEmail(),
                request.getPassword(),
                request.getRole());
        notificationService.notifyUser(
                createdUser.getUsername(),
                null,
                "ACCOUNT_CREATED",
                "Your account is ready",
                "An admin created your " + createdUser.getRole() + " account. You can now sign in to E-Court.",
                null);
        return UserSummaryResponse.from(createdUser);
    }

    public UserSummaryResponse updateUserRole(Long userId, String role, String actorUsername) {
        User user = findUser(userId);
        String normalizedRole = userService.normalizeAdminManagedRole(role);

        if (user.getUsername().equals(actorUsername) && !"ADMIN".equals(normalizedRole)) {
            throw new ResponseStatusException(BAD_REQUEST, "Admin users cannot remove their own ADMIN role.");
        }

        String previousRole = user.getRole();
        user.setRole(normalizedRole);
        User savedUser = userRepository.save(user);
        notificationService.notifyUser(
                savedUser.getUsername(),
                actorUsername,
                "USER_ROLE_UPDATED",
                "Your role was updated",
                "Admin " + actorUsername + " changed your role from " + previousRole + " to " + normalizedRole + ".",
                null);
        return UserSummaryResponse.from(savedUser);
    }

    public UserSummaryResponse updateUserStatus(Long userId, boolean active, String actorUsername) {
        User user = findUser(userId);

        if (user.getUsername().equals(actorUsername) && !active) {
            throw new ResponseStatusException(BAD_REQUEST, "Admin users cannot deactivate their own account.");
        }

        boolean previousActive = user.isActive();
        user.setActive(active);
        User savedUser = userRepository.save(user);
        notificationService.notifyUser(
                savedUser.getUsername(),
                actorUsername,
                "USER_STATUS_UPDATED",
                active ? "Your account was activated" : "Your account was deactivated",
                "Admin " + actorUsername + " changed your account status from "
                        + (previousActive ? "ACTIVE" : "INACTIVE") + " to " + (active ? "ACTIVE" : "INACTIVE") + ".",
                null);
        return UserSummaryResponse.from(savedUser);
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));
    }

    private int validatePage(int page) {
        if (page < 0) {
            throw new ResponseStatusException(BAD_REQUEST, "Page index must be zero or greater.");
        }
        return page;
    }

    private int validateSize(int size) {
        if (size < 1 || size > 100) {
            throw new ResponseStatusException(BAD_REQUEST, "Page size must be between 1 and 100.");
        }
        return size;
    }
}
