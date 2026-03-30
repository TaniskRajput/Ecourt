package com.ecourt.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record CaseResponse(
                String caseNumber,
                String title,
                String description,
                com.ecourt.model.CaseStatus status,
                LocalDate filedDate,
                String clientUsername,
                String lawyerUsername,
                String judgeUsername,
                Instant createdAt,
                Instant updatedAt,
                List<CaseDocumentResponse> documents) {
}
