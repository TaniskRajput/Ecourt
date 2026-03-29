package com.ecourt.repository;

import com.ecourt.model.CaseDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CaseDocumentRepository extends JpaRepository<CaseDocument, Long> {

    List<CaseDocument> findByCourtCaseIdOrderByUploadedAtDesc(Long courtCaseId);

    Optional<CaseDocument> findByIdAndCourtCaseId(Long id, Long courtCaseId);
}
