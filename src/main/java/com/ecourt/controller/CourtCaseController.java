package com.ecourt.controller;

import com.ecourt.dto.CaseAuditEventResponse;
import com.ecourt.dto.CaseCreateRequest;
import com.ecourt.dto.CaseDocumentResponse;
import com.ecourt.dto.CaseListResponse;
import com.ecourt.dto.CaseResponse;
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
            @RequestParam(required = false) String query
    ) {
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
                query
        );
    }

    @GetMapping("/{caseNumber}")
    public CaseResponse getCase(@PathVariable String caseNumber) {
        return caseService.getCase(caseNumber);
    }

    @PutMapping("/{caseNumber}/assign")
    public MessageResponse assignJudge(
            @PathVariable String caseNumber,
            @RequestParam(required = false) String judgeUsername
    ) {
        return new MessageResponse(caseService.assignJudge(caseNumber, judgeUsername));
    }

    @PutMapping("/{caseNumber}/status")
    public MessageResponse updateCaseStatus(@PathVariable String caseNumber, @RequestParam String status) {
        return new MessageResponse(caseService.updateCaseStatus(caseNumber, status));
    }

    @PostMapping(path = "/{caseNumber}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CaseDocumentResponse> uploadDocument(
            @PathVariable String caseNumber,
            @RequestParam("file") MultipartFile file
    ) {
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

    @GetMapping("/{caseNumber}/documents/{documentId}/download")
    public ResponseEntity<Resource> downloadDocument(
            @PathVariable String caseNumber,
            @PathVariable Long documentId
    ) {
        var download = caseService.downloadDocument(caseNumber, documentId);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(download.contentType()))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + download.originalFilename() + "\""
                )
                .body(download.resource());
    }
}
