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

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final UserService userService;

    public AdminService(UserRepository userRepository, UserService userService) {
        this.userRepository = userRepository;
        this.userService = userService;
    }

    public UserListResponse getUsers(String role, Boolean active, String query, int page, int size) {
        Pageable pageable = PageRequest.of(validatePage(page), validateSize(size));
        Page<UserSummaryResponse> result = userRepository.findAll((root, criteriaQuery, criteriaBuilder) -> {
                    List<Predicate> predicates = new ArrayList<>();

                    if (role != null && !role.trim().isEmpty()) {
                        predicates.add(criteriaBuilder.equal(
                                criteriaBuilder.upper(root.get("role")),
                                role.trim().toUpperCase(Locale.ROOT)
                        ));
                    }

                    if (active != null) {
                        predicates.add(criteriaBuilder.equal(root.get("active"), active));
                    }

                    if (query != null && !query.trim().isEmpty()) {
                        String pattern = "%" + query.trim().toLowerCase(Locale.ROOT) + "%";
                        predicates.add(criteriaBuilder.or(
                                criteriaBuilder.like(criteriaBuilder.lower(root.get("username")), pattern),
                                criteriaBuilder.like(criteriaBuilder.lower(root.get("email")), pattern)
                        ));
                    }

                    return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
                }, pageable)
                .map(UserSummaryResponse::from);

        return new UserListResponse(
                result.getContent(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages()
        );
    }

    public UserSummaryResponse createUser(AdminCreateUserRequest request) {
        return UserSummaryResponse.from(userService.createManagedUser(
                request.getUsername(),
                request.getEmail(),
                request.getPassword(),
                request.getRole()
        ));
    }

    public UserSummaryResponse updateUserRole(Long userId, String role, String actorUsername) {
        User user = findUser(userId);
        String normalizedRole = userService.normalizeAdminManagedRole(role);

        if (user.getUsername().equals(actorUsername) && !"ADMIN".equals(normalizedRole)) {
            throw new ResponseStatusException(BAD_REQUEST, "Admin users cannot remove their own ADMIN role.");
        }

        user.setRole(normalizedRole);
        return UserSummaryResponse.from(userRepository.save(user));
    }

    public UserSummaryResponse updateUserStatus(Long userId, boolean active, String actorUsername) {
        User user = findUser(userId);

        if (user.getUsername().equals(actorUsername) && !active) {
            throw new ResponseStatusException(BAD_REQUEST, "Admin users cannot deactivate their own account.");
        }

        user.setActive(active);
        return UserSummaryResponse.from(userRepository.save(user));
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
