package com.ecourt.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record CaseResponse(
        String caseNumber,
        String title,
        String description,
        String courtName,
        com.ecourt.model.CaseStatus status,
        LocalDate filedDate,
        String clientUsername,
        String lawyerUsername,
        String judgeUsername,
        Instant createdAt,
        Instant updatedAt,
        List<CaseDocumentResponse> documents,
        List<HearingResponse> hearings,
        List<CaseDocumentResponse> orderDocuments,
        // Carries the hearing/disposal forecast used by the new AI Insight panel.
        CaseInsightResponse insight,
        List<com.ecourt.model.CaseStatus> allowedNextStatuses,
        boolean canAssignJudge,
        boolean canUpdateStatus,
        boolean canUploadDocuments,
        boolean canManageHearings,
        boolean canManageOrders) {
}
