package com.ecourt.repository;

import com.ecourt.model.CaseDocument;
import com.ecourt.model.DocumentCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CaseDocumentRepository extends JpaRepository<CaseDocument, Long> {

    List<CaseDocument> findByCourtCaseIdOrderByUploadedAtDesc(Long courtCaseId);

    List<CaseDocument> findByCourtCaseIdAndCategoryOrderByUploadedAtDesc(Long courtCaseId, DocumentCategory category);

    Optional<CaseDocument> findByIdAndCourtCaseId(Long id, Long courtCaseId);

    Optional<CaseDocument> findByIdAndCourtCaseIdAndCategory(Long id, Long courtCaseId, DocumentCategory category);
}
