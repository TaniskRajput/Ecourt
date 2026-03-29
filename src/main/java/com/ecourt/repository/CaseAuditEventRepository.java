package com.ecourt.repository;

import com.ecourt.model.CaseAuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CaseAuditEventRepository extends JpaRepository<CaseAuditEvent, Long> {

    List<CaseAuditEvent> findByCourtCaseIdOrderByOccurredAtDesc(Long courtCaseId);
}
