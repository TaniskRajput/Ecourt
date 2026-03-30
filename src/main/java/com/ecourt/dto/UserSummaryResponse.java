package com.ecourt.dto;

import com.ecourt.model.User;
import java.time.Instant;

public record UserSummaryResponse(Long id, String username, String email, String role, boolean active,
        Instant createdAt) {

    public static UserSummaryResponse from(User user) {
        return new UserSummaryResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole(),
                user.isActive(),
                user.getCreatedAt());
    }
}
