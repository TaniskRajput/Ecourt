package com.ecourt.repository;

import com.ecourt.model.HearingRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HearingRecordRepository extends JpaRepository<HearingRecord, Long> {

    List<HearingRecord> findByCourtCaseIdOrderByHearingDateDescCreatedAtDesc(Long courtCaseId);
}
