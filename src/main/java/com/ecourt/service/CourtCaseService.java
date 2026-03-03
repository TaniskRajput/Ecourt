package com.ecourt.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.AccessDeniedException;
import java.util.List;
import com.ecourt.model.CourtCase;
import com.ecourt.repository.CourtCaseRepository;

@Service
public class CourtCaseService {

    @Autowired
    private CourtCaseRepository caseRepository;

    public String addCase(CourtCase courtCase) {

        if (caseRepository.findByCaseNumber(courtCase.getCaseNumber()).isPresent()) {
            return "Case already exists";
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            courtCase.setLawyerUsername(auth.getName());
        }

        courtCase.setStatus("PENDING");
        caseRepository.save(courtCase);

        return "Case added successfully";
    }

    public CourtCase getCase(String caseNumber) {
        CourtCase courtCase = caseRepository.findByCaseNumber(caseNumber).orElse(null);
        if (courtCase == null)
            return null;

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_CLIENT"))) {
            if (!auth.getName().equals(courtCase.getClientUsername())) {
                throw new AccessDeniedException("Access denied: You can only view your own cases.");
            }
        }
        return courtCase;
    }

    public List<CourtCase> getCasesForLawyer() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null)
            return null;

        // This is protected by SecurityConfig `.hasAnyRole`, but we only want to fetch
        // for this lawyer natively
        return caseRepository.findByLawyerUsername(auth.getName());
    }

    public String assignJudge(String caseNumber) {
        CourtCase courtCase = caseRepository.findByCaseNumber(caseNumber).orElse(null);
        if (courtCase == null)
            return "Case not found";

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_JUDGE"))) {
            courtCase.setJudgeUsername(auth.getName());
            caseRepository.save(courtCase);
            return "Judge assigned successfully";
        }
        throw new AccessDeniedException("Access denied: Only judges can assign themselves to cases.");
    }

    public String updateCaseStatus(String caseNumber, String status) {
        CourtCase courtCase = caseRepository.findByCaseNumber(caseNumber).orElse(null);
        if (courtCase == null)
            return "Case not found";

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_JUDGE"))) {
            if (!auth.getName().equals(courtCase.getJudgeUsername())) {
                throw new AccessDeniedException("Access denied: You are not assigned to this case.");
            }
            courtCase.setStatus(status);
            caseRepository.save(courtCase);
            return "Case status updated to " + status;
        }
        throw new AccessDeniedException("Access denied: Only assigned judges can update status.");
    }
}
