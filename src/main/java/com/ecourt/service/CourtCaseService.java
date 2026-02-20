package com.ecourt.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.ecourt.model.CourtCase;
import com.ecourt.repository.CourtCaseRepository;

@Service
public class CourtCaseService {

    @Autowired
    private CourtCaseRepository caseRepository;

    public String addCase(CourtCase courtCase) {

        if(caseRepository.findByCaseNumber(courtCase.getCaseNumber()).isPresent()){
            return "Case already exists";
        }

        courtCase.setStatus("PENDING");
        caseRepository.save(courtCase);

        return "Case added successfully";
    }

    public CourtCase getCase(String caseNumber) {
        return caseRepository.findByCaseNumber(caseNumber).orElse(null);
    }
}
