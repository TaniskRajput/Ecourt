package com.ecourt.dto;

import java.util.List;

public record CaseListResponse(
        List<CaseResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
}
