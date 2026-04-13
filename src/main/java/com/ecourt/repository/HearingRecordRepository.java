package com.ecourt.repository;

import com.ecourt.model.HearingRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HearingRecordRepository extends JpaRepository<HearingRecord, Long> {

    List<HearingRecord> findByCourtCaseIdOrderByHearingDateDescCreatedAtDesc(Long courtCaseId);

    // Lets the predictor estimate future dates using the assigned judge's past hearing cadence.
    List<HearingRecord> findByJudgeNameIgnoreCaseOrderByHearingDateAscCreatedAtAsc(String judgeName);

    // Lets the predictor fall back to court-level patterns when case-specific history is sparse.
    List<HearingRecord> findByCourtCase_CourtNameIgnoreCaseOrderByHearingDateAscCreatedAtAsc(String courtName);
}
