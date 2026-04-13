package com.ecourt.service;

import com.ecourt.dto.CaseInsightResponse;
import com.ecourt.model.CourtCase;
import com.ecourt.model.HearingRecord;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service
public class CaseInsightService {

    private final LocalCaseInsightEstimator localCaseInsightEstimator;
    private final RestClient restClient;
    private final boolean pythonEnabled;

    public CaseInsightService(
            LocalCaseInsightEstimator localCaseInsightEstimator,
            @Value("${app.insights.python.enabled:true}") boolean pythonEnabled,
            @Value("${app.insights.python.url:http://127.0.0.1:5001/predict}") String pythonServiceUrl) {
        this.localCaseInsightEstimator = localCaseInsightEstimator;
        this.pythonEnabled = pythonEnabled;
        this.restClient = RestClient.builder()
                .baseUrl(pythonServiceUrl)
                .build();
    }

    /**
     * Main insight entry point used by the case response mapper.
     *
     * Relevance:
     * This service now makes the project genuinely Python-backed. It sends the case
     * data to the Python microservice, receives a JSON prediction, and only falls
     * back to local Java estimation if Python is unavailable so the app remains usable.
     */
    public CaseInsightResponse buildInsight(CourtCase courtCase, List<HearingRecord> caseHearings) {
        if (!pythonEnabled) {
            return localCaseInsightEstimator.buildInsight(courtCase, caseHearings);
        }

        try {
            PythonInsightRequest payload = toPythonRequest(courtCase, caseHearings);
            return restClient.post()
                    .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(CaseInsightResponse.class);
        } catch (RuntimeException exception) {
            // Intentionally swallow Python connectivity/conversion issues and fall back below.
        }

        // If the Python process is not running, the UI still gets a useful estimate
        // instead of failing the entire case details API.
        return localCaseInsightEstimator.buildInsight(courtCase, caseHearings);
    }

    private PythonInsightRequest toPythonRequest(CourtCase courtCase, List<HearingRecord> caseHearings) {
        return new PythonInsightRequest(
                courtCase.getCaseNumber(),
                courtCase.getCourtName(),
                courtCase.getStatus().name(),
                courtCase.getFiledDate(),
                courtCase.getJudgeUsername(),
                caseHearings.stream()
                        .map(hearing -> new PythonHearingRecord(
                                hearing.getHearingDate(),
                                hearing.getNextHearingDate(),
                                hearing.getJudgeName(),
                                hearing.getCreatedAt()))
                        .toList());
    }

    /**
     * Minimal JSON shape the Python service needs to make a prediction.
     *
     * Relevance:
     * Sending a small, explicit payload keeps the Java/Python bridge easy to debug
     * and easy to explain during project demos or viva discussions.
     */
    private record PythonInsightRequest(
            String caseNumber,
            String courtName,
            String status,
            LocalDate filedDate,
            String judgeUsername,
            List<PythonHearingRecord> hearings) {
    }

    private record PythonHearingRecord(
            LocalDate hearingDate,
            LocalDate nextHearingDate,
            String judgeName,
            Instant createdAt) {
    }
}
