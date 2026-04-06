package com.ecourt.controller;

import com.ecourt.dto.PublicCaseSearchItemResponse;
import com.ecourt.dto.PublicCaseTrackDetailResponse;
import com.ecourt.service.CourtCaseService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/public/cases")
public class PublicCaseTrackingController {

    private final CourtCaseService caseService;

    public PublicCaseTrackingController(CourtCaseService caseService) {
        this.caseService = caseService;
    }

    @GetMapping("/track")
    public List<PublicCaseSearchItemResponse> searchCases(
            @RequestParam(required = false) String caseNumber,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String courtName) {
        return caseService.searchPublicCases(caseNumber, year, courtName);
    }

    @GetMapping("/{caseNumber}")
    public PublicCaseTrackDetailResponse getCaseTrackingDetail(@PathVariable String caseNumber) {
        return caseService.getPublicCaseTrackingDetail(caseNumber);
    }

    @GetMapping("/{caseNumber}/orders/{documentId}/download")
    public ResponseEntity<Resource> downloadOrder(
            @PathVariable String caseNumber,
            @PathVariable Long documentId) {
        var download = caseService.downloadPublicOrder(caseNumber, documentId);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(download.contentType()))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + download.originalFilename() + "\"")
                .body(download.resource());
    }
}
