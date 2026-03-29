package com.ecourt.dto;

import com.ecourt.model.User;

public record UserSummaryResponse(Long id, String username, String email, String role, boolean active) {

    public static UserSummaryResponse from(User user) {
        return new UserSummaryResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole(),
                user.isActive()
        );
    }
}
