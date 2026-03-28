package com.ecourt.controller;

import com.ecourt.model.CourtCase;
import com.ecourt.service.CourtCaseService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/cases")
public class CourtCaseController {

    private final CourtCaseService caseService;

    public CourtCaseController(CourtCaseService caseService) {
        this.caseService = caseService;
    }

    // LAWYER
    @PostMapping
    public String addCase(@RequestBody CourtCase courtCase) {
        return caseService.addCase(courtCase);
    }

    // LAWYER (Get ALL their cases)
    @GetMapping("/lawyer")
    public List<CourtCase> getCasesForLawyer() {
        return caseService.getCasesForLawyer();
    }

    @GetMapping("/all")
    public List<CourtCase> getAllCases() {
        return caseService.getAllCases();
    }

    // USER / GENERIC
    @GetMapping("/{caseNumber}")
    public CourtCase getCase(@PathVariable String caseNumber) {
        return caseService.getCase(caseNumber);
    }

    // JUDGE
    @PutMapping("/{caseNumber}/assign")
    public String assignJudge(@PathVariable String caseNumber) {
        return caseService.assignJudge(caseNumber);
    }

    // JUDGE
    @PutMapping("/{caseNumber}/status")
    public String updateCaseStatus(@PathVariable String caseNumber, @RequestParam String status) {
        return caseService.updateCaseStatus(caseNumber, status);
    }
}
