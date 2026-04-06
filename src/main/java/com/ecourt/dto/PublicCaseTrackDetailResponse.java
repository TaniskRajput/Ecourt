package com.ecourt.dto;

import com.ecourt.model.CaseStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record PublicCaseTrackDetailResponse(
        String caseNumber,
        String title,
        String description,
        String courtName,
        CaseStatus status,
        LocalDate filedDate,
        String clientUsername,
        String lawyerUsername,
        String judgeUsername,
        Instant updatedAt,
        List<HearingResponse> hearings,
        List<CaseDocumentResponse> orders
) {
}
