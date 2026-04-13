package com.ecourt.dto;

import java.time.LocalDate;

/**
 * Packages the forecast fields shown in the case detail UI.
 *
 * Relevance:
 * This DTO is the contract between the backend predictor and the frontend
 * "AI Insight" card. It keeps every estimate in one object so the case API can
 * return prediction data alongside normal case details.
 */
public record CaseInsightResponse(
        LocalDate predictedNextHearingDate,
        Integer predictedNextHearingInDays,
        LocalDate estimatedDisposalDate,
        Integer estimatedDisposalInDays,
        int confidenceScore,
        String confidenceLabel,
        String summary,
        String reasoning) {
}
