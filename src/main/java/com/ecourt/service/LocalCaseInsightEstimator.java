package com.ecourt.service;

import com.ecourt.dto.CaseInsightResponse;
import com.ecourt.model.CaseStatus;
import com.ecourt.model.CourtCase;
import com.ecourt.model.HearingRecord;
import com.ecourt.repository.HearingRecordRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class LocalCaseInsightEstimator {

    private final HearingRecordRepository hearingRecordRepository;

    public LocalCaseInsightEstimator(HearingRecordRepository hearingRecordRepository) {
        this.hearingRecordRepository = hearingRecordRepository;
    }

    /**
     * Java fallback estimator used when the Python predictor is not reachable.
     *
     * Relevance:
     * The project now uses Python for the actual prediction path, but the app still
     * needs a resilient local estimate so the UI and automated tests continue to work
     * even if the Python microservice is not running.
     */
    public CaseInsightResponse buildInsight(CourtCase courtCase, List<HearingRecord> caseHearings) {
        LocalDate today = LocalDate.now();
        if (courtCase.getStatus() == CaseStatus.CLOSED) {
            return new CaseInsightResponse(
                    null,
                    null,
                    today,
                    0,
                    100,
                    "Closed",
                    "Case already closed",
                    "This case has already reached the terminal workflow state.");
        }

        HearingRecord latestHearing = caseHearings.stream()
                .max(Comparator.comparing(HearingRecord::getHearingDate)
                        .thenComparing(HearingRecord::getCreatedAt))
                .orElse(null);

        LocalDate explicitNextHearingDate = latestHearing != null ? latestHearing.getNextHearingDate() : null;
        if (explicitNextHearingDate != null && explicitNextHearingDate.isBefore(today)) {
            explicitNextHearingDate = null;
        }

        List<Long> currentCaseIntervals = extractIntervals(caseHearings);
        List<Long> judgeIntervals = hasText(courtCase.getJudgeUsername())
                ? extractIntervals(hearingRecordRepository
                        .findByJudgeNameIgnoreCaseOrderByHearingDateAscCreatedAtAsc(courtCase.getJudgeUsername()))
                : List.of();
        List<Long> courtIntervals = hasText(courtCase.getCourtName())
                ? extractIntervals(hearingRecordRepository
                        .findByCourtCase_CourtNameIgnoreCaseOrderByHearingDateAscCreatedAtAsc(courtCase.getCourtName()))
                : List.of();

        InsightSeed seed = resolveSeed(courtCase, explicitNextHearingDate, currentCaseIntervals, judgeIntervals, courtIntervals);
        LocalDate predictedNextHearingDate = explicitNextHearingDate != null
                ? explicitNextHearingDate
                : seed.baseDate().plusDays(seed.cadenceDays());

        if (predictedNextHearingDate.isBefore(today)) {
            predictedNextHearingDate = today.plusDays(Math.max(7, seed.cadenceDays()));
        }

        int daysUntilNextHearing = (int) ChronoUnit.DAYS.between(today, predictedNextHearingDate);
        if (daysUntilNextHearing < 0) {
            daysUntilNextHearing = 0;
        }

        int estimatedDisposalInDays = estimateDisposalDays(courtCase, caseHearings.size(), seed.cadenceDays(), daysUntilNextHearing);
        LocalDate estimatedDisposalDate = today.plusDays(estimatedDisposalInDays);

        return new CaseInsightResponse(
                predictedNextHearingDate,
                daysUntilNextHearing,
                estimatedDisposalDate,
                estimatedDisposalInDays,
                seed.confidenceScore(),
                toConfidenceLabel(seed.confidenceScore()),
                buildSummary(daysUntilNextHearing, estimatedDisposalInDays),
                seed.reasoning());
    }

    private InsightSeed resolveSeed(
            CourtCase courtCase,
            LocalDate explicitNextHearingDate,
            List<Long> currentCaseIntervals,
            List<Long> judgeIntervals,
            List<Long> courtIntervals) {
        if (explicitNextHearingDate != null) {
            return new InsightSeed(
                    explicitNextHearingDate,
                    Math.max(1, daysBetween(LocalDate.now(), explicitNextHearingDate)),
                    96,
                    "Prediction uses the explicitly recorded next hearing date from the latest hearing entry.");
        }

        if (!currentCaseIntervals.isEmpty()) {
            long cadence = median(currentCaseIntervals);
            return new InsightSeed(
                    LocalDate.now(),
                    sanitizeCadence(cadence),
                    84,
                    "Prediction uses the hearing cadence already observed on this case.");
        }

        if (!judgeIntervals.isEmpty()) {
            long cadence = median(judgeIntervals);
            return new InsightSeed(
                    LocalDate.now(),
                    sanitizeCadence(cadence),
                    74,
                    "Prediction uses recent hearing gaps handled by the assigned judge.");
        }

        if (!courtIntervals.isEmpty()) {
            long cadence = median(courtIntervals);
            return new InsightSeed(
                    LocalDate.now(),
                    sanitizeCadence(cadence),
                    66,
                    "Prediction uses hearing cadence seen in this court.");
        }

        return new InsightSeed(
                LocalDate.now(),
                defaultCadenceDays(courtCase.getStatus()),
                hasText(courtCase.getJudgeUsername()) ? 54 : 46,
                "Prediction uses the current case stage and judge assignment because there is not enough hearing history yet.");
    }

    private int estimateDisposalDays(CourtCase courtCase, int hearingCount, int cadenceDays, int daysUntilNextHearing) {
        int baseRemaining = switch (courtCase.getStatus()) {
            case FILED -> 300;
            case SCRUTINY -> 240;
            case HEARING -> 180;
            case ARGUMENT -> 90;
            case JUDGMENT -> 30;
            case CLOSED -> 0;
        };

        int adjustment = 0;
        if (!hasText(courtCase.getJudgeUsername())) {
            adjustment += 45;
        }
        if (hearingCount == 0) {
            adjustment += 30;
        } else {
            adjustment += Math.min(hearingCount * 8, 48);
        }
        adjustment += Math.min(cadenceDays, 60);

        int stageBuffer = switch (courtCase.getStatus()) {
            case FILED, SCRUTINY -> daysUntilNextHearing;
            case HEARING -> daysUntilNextHearing + Math.max(cadenceDays, 21);
            case ARGUMENT -> Math.max(daysUntilNextHearing, 21);
            case JUDGMENT -> Math.max(daysUntilNextHearing / 2, 7);
            case CLOSED -> 0;
        };

        return Math.max(baseRemaining, stageBuffer + adjustment);
    }

    private List<Long> extractIntervals(List<HearingRecord> hearings) {
        List<HearingRecord> sortedHearings = hearings.stream()
                .sorted(Comparator.comparing(HearingRecord::getHearingDate)
                        .thenComparing(HearingRecord::getCreatedAt))
                .toList();
        List<Long> intervals = new ArrayList<>();
        for (int i = 1; i < sortedHearings.size(); i++) {
            long days = ChronoUnit.DAYS.between(
                    sortedHearings.get(i - 1).getHearingDate(),
                    sortedHearings.get(i).getHearingDate());
            if (days > 0) {
                intervals.add(days);
            }
        }
        return intervals;
    }

    private long median(List<Long> values) {
        List<Long> sorted = values.stream()
                .sorted()
                .toList();
        return sorted.get(sorted.size() / 2);
    }

    private int sanitizeCadence(long cadence) {
        return (int) Math.max(7, Math.min(cadence, 90));
    }

    private int defaultCadenceDays(CaseStatus status) {
        return switch (status) {
            case FILED -> 45;
            case SCRUTINY -> 30;
            case HEARING -> 28;
            case ARGUMENT -> 21;
            case JUDGMENT -> 14;
            case CLOSED -> 0;
        };
    }

    private String buildSummary(int nextHearingDays, int disposalDays) {
        return "Next hearing is estimated in " + nextHearingDays
                + " day" + (nextHearingDays == 1 ? "" : "s")
                + ", with disposal expected in about " + disposalDays
                + " day" + (disposalDays == 1 ? "" : "s") + ".";
    }

    private String toConfidenceLabel(int score) {
        if (score >= 90) {
            return "Very High";
        }
        if (score >= 75) {
            return "High";
        }
        if (score >= 60) {
            return "Medium";
        }
        return "Early Estimate";
    }

    private int daysBetween(LocalDate start, LocalDate end) {
        return (int) ChronoUnit.DAYS.between(start, end);
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private record InsightSeed(
            LocalDate baseDate,
            int cadenceDays,
            int confidenceScore,
            String reasoning) {
    }
}
