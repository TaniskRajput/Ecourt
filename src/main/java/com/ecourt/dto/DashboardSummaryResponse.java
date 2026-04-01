package com.ecourt.dto;

import java.util.List;

public record DashboardSummaryResponse(
        String role,
        long totalCases,
        long activeCases,
        long closedCases,
        long unassignedCases,
        long pendingActions,
        long totalUsers,
        long activeJudges,
        List<CaseResponse> recentCases,
        List<CaseAuditEventResponse> recentActions) {
}
