package com.ecourt.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.ecourt.model.CourtCase;
import com.ecourt.service.CourtCaseService;

@RestController
@RequestMapping("/cases")
public class CourtCaseController {

    @Autowired
    private CourtCaseService caseService;

    // ADMIN
    @PostMapping
    public String addCase(@RequestBody CourtCase courtCase) {
        return caseService.addCase(courtCase);
    }

    // USER
    @GetMapping("/{caseNumber}")
    public CourtCase getCase(@PathVariable String caseNumber) {
        return caseService.getCase(caseNumber);
    }
}
