package com.ecourt.dto;

import com.ecourt.model.CaseStatus;

import java.time.Instant;
import java.time.LocalDate;

public record PublicCaseSearchItemResponse(
        String caseNumber,
        String title,
        String courtName,
        CaseStatus status,
        LocalDate filedDate,
        Instant updatedAt,
        String caseSummary
) {
}
