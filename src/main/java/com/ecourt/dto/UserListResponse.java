package com.ecourt.dto;

import java.util.List;

public record UserListResponse(
        List<UserSummaryResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
}
