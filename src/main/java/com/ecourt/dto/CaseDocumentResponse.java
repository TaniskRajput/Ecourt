package com.ecourt.dto;

import java.time.Instant;

public record CaseDocumentResponse(
        Long id,
        String originalFilename,
        String contentType,
        long sizeBytes,
        String uploadedBy,
        Instant uploadedAt
) {
}
