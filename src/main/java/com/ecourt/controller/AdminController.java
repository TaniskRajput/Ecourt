package com.ecourt.controller;

import com.ecourt.dto.AdminCreateUserRequest;
import com.ecourt.dto.UpdateUserRoleRequest;
import com.ecourt.dto.UpdateUserStatusRequest;
import com.ecourt.dto.UserListResponse;
import com.ecourt.dto.UserSummaryResponse;
import com.ecourt.service.AdminService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST Controller responsible for Administrator-level operations.
 * 
 * WHY IT IS USED:
 * This file serves as the API entry point for the Admin dashboard. It is
 * strictly secured
 * to users with the "ADMIN" role (enforced via endpoint configuration in
 * SecurityConfig).
 * It allows admins to oversee the entire user base, manage staff roles (e.g.,
 * promoting a user to JUDGE),
 * and instantly deactivate malicious or obsolete accounts.
 *
 * FUNCTIONS OVERVIEW:
 * - getUsers: Fetches a paginated, searchable, and filterable list of all
 * registered users, sorted by newest first.
 * - createUser: Allows admins to directly provision new accounts (e.g.,
 * creating a new JUDGE account).
 * - updateUserRole: Modifies a user's role (e.g., CLIENT -> LAWYER).
 * - updateUserStatus: Activates or deactivates a user account, preventing them
 * from logging in.
 */
@RestController
@RequestMapping("/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/users")
    public UserListResponse getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) String query) {
        return adminService.getUsers(role, active, query, page, size);
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public UserSummaryResponse createUser(@Valid @RequestBody AdminCreateUserRequest request) {
        return adminService.createUser(request);
    }

    @PutMapping("/users/{userId}/role")
    public UserSummaryResponse updateUserRole(
            @PathVariable Long userId,
            @Valid @RequestBody UpdateUserRoleRequest request,
            Authentication authentication) {
        return adminService.updateUserRole(userId, request.getRole(), authentication.getName());
    }

    @PutMapping("/users/{userId}/status")
    public UserSummaryResponse updateUserStatus(
            @PathVariable Long userId,
            @RequestBody UpdateUserStatusRequest request,
            Authentication authentication) {
        return adminService.updateUserStatus(userId, request.isActive(), authentication.getName());
    }
}
