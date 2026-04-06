package com.ecourt.controller;

import com.ecourt.dto.CaseAuditEventResponse;
import com.ecourt.dto.CaseCreateRequest;
import com.ecourt.dto.CaseDocumentResponse;
import com.ecourt.dto.CaseListResponse;
import com.ecourt.dto.CaseResponse;
import com.ecourt.dto.DashboardSummaryResponse;
import com.ecourt.dto.HearingCreateRequest;
import com.ecourt.dto.HearingResponse;
import com.ecourt.dto.MessageResponse;
import com.ecourt.service.CourtCaseService;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.time.LocalDate;

/**
 * REST Controller responsible for Case Management Operations.
 * 
 * WHY IT IS USED:
 * This file is the core API for interacting with legal cases. It provides
 * role-based access to
 * view, search, and modify cases. Clients, Lawyers, Judges, and Admins all
 * interact with cases
 * through these REST endpoints, which delegate complex state-machine
 * validations and document
 * storage operations to the underlying CourtCaseService.
 *
 * FUNCTIONS OVERVIEW:
 * - addCase: Submits a new legal case into the system (initial status: FILED).
 * - getMyCases: Retrieves all cases associated with the currently authenticated
 * user.
 * - getAllCases: Retrieves the entire registry of active cases (usually for
 * Admins).
 * - searchCases: Provides advanced paginated searching and filtering of cases.
 * - getCase: Retrieves full details of a specific case by its unique tracking
 * number.
 * - assignJudge: Allows Admins to assign a specific Judge to oversee a case.
 * - updateCaseStatus: Advances the case through the workflow state machine
 * (e.g., SCRUTINY -> HEARING).
 * - uploadDocument / getDocuments / downloadDocument: Manages physical file
 * attachments for a case.
 * - getAuditEvents: Retrieves an immutable trail of historical status jumps and
 * document associations.
 */
@RestController
@RequestMapping("/cases")
public class CourtCaseController {

    private final CourtCaseService caseService;

    public CourtCaseController(CourtCaseService caseService) {
        this.caseService = caseService;
    }

    @PostMapping
    public ResponseEntity<CaseResponse> addCase(@Valid @RequestBody CaseCreateRequest request) {
        return ResponseEntity.ok(caseService.addCase(request));
    }

    @GetMapping("/my")
    public List<CaseResponse> getMyCases() {
        return caseService.getCasesForCurrentUser();
    }

    @GetMapping("/all")
    public List<CaseResponse> getAllCases() {
        return caseService.getAllCases();
    }

    @GetMapping("/dashboard")
    public DashboardSummaryResponse getDashboardSummary() {
        return caseService.getDashboardSummary();
    }

    @GetMapping("/search")
    public CaseListResponse searchCases(
            @RequestParam(defaultValue = "my") String scope,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String clientUsername,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String judgeUsername,
            @RequestParam(required = false) String lawyerUsername,
            @RequestParam(required = false) LocalDate filedDate,
            @RequestParam(required = false) LocalDate filedFrom,
            @RequestParam(required = false) LocalDate filedTo,
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "filedDate") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
        return caseService.searchCases(
                scope,
                page,
                size,
                clientUsername,
                status,
                judgeUsername,
                lawyerUsername,
                filedDate,
                filedFrom,
                filedTo,
                query,
                sortBy,
                direction);
    }

    @GetMapping("/{caseNumber}")
    public CaseResponse getCase(@PathVariable String caseNumber) {
        return caseService.getCase(caseNumber);
    }

    @PutMapping("/{caseNumber}/assign")
    public MessageResponse assignJudge(
            @PathVariable String caseNumber,
            @RequestParam(required = false) String judgeUsername) {
        return new MessageResponse(caseService.assignJudge(caseNumber, judgeUsername));
    }

    @PutMapping("/{caseNumber}/status")
    public MessageResponse updateCaseStatus(@PathVariable String caseNumber, @RequestParam String status) {
        return new MessageResponse(caseService.updateCaseStatus(caseNumber, status));
    }

    @PostMapping(path = "/{caseNumber}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CaseDocumentResponse> uploadDocument(
            @PathVariable String caseNumber,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(caseService.uploadDocument(caseNumber, file));
    }

    @GetMapping("/{caseNumber}/documents")
    public List<CaseDocumentResponse> getDocuments(@PathVariable String caseNumber) {
        return caseService.getDocuments(caseNumber);
    }

    @GetMapping("/{caseNumber}/audit")
    public List<CaseAuditEventResponse> getAuditEvents(@PathVariable String caseNumber) {
        return caseService.getAuditEvents(caseNumber);
    }

    @PostMapping("/{caseNumber}/hearings")
    public ResponseEntity<HearingResponse> addHearing(
            @PathVariable String caseNumber,
            @Valid @RequestBody HearingCreateRequest request) {
        return ResponseEntity.ok(caseService.addHearing(caseNumber, request));
    }

    @GetMapping("/{caseNumber}/hearings")
    public List<HearingResponse> getHearings(@PathVariable String caseNumber) {
        return caseService.getHearings(caseNumber);
    }

    @PostMapping(path = "/{caseNumber}/orders", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CaseDocumentResponse> uploadOrder(
            @PathVariable String caseNumber,
            @RequestParam(required = false) String title,
            @RequestParam String orderType,
            @RequestParam(required = false) LocalDate orderDate,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(caseService.uploadOrder(caseNumber, title, orderType, orderDate, file));
    }

    @GetMapping("/{caseNumber}/orders")
    public List<CaseDocumentResponse> getOrders(@PathVariable String caseNumber) {
        return caseService.getOrders(caseNumber);
    }

    @GetMapping("/{caseNumber}/documents/{documentId}/download")
    public ResponseEntity<Resource> downloadDocument(
            @PathVariable String caseNumber,
            @PathVariable Long documentId) {
        var download = caseService.downloadDocument(caseNumber, documentId);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(download.contentType()))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + download.originalFilename() + "\"")
                .body(download.resource());
    }
}
