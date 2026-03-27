package com.ecourt.service;

import com.ecourt.model.CourtCase;
import com.ecourt.repository.CourtCaseRepository;
import com.ecourt.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class CourtCaseService {

    private static final Set<String> ALLOWED_STATUSES = Set.of("PENDING", "IN_PROGRESS", "CLOSED");

    private final CourtCaseRepository caseRepository;
    private final UserRepository userRepository;

    public CourtCaseService(CourtCaseRepository caseRepository, UserRepository userRepository) {
        this.caseRepository = caseRepository;
        this.userRepository = userRepository;
    }

    public String addCase(CourtCase courtCase) {
        String caseNumber = normalizeRequired(courtCase.getCaseNumber(), "Case number is required");
        String clientUsername = normalizeRequired(courtCase.getClientUsername(), "Client username is required");

        if (caseRepository.findByCaseNumber(caseNumber).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Case already exists");
        }

        boolean validClient = userRepository.findByUsername(clientUsername)
                .map(user -> "CLIENT".equalsIgnoreCase(user.getRole()))
                .orElse(false);

        if (!validClient) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Client username must belong to a registered client."
            );
        }

        courtCase.setCaseNumber(caseNumber);
        courtCase.setTitle(normalizeRequired(courtCase.getTitle(), "Title is required"));
        courtCase.setDescription(normalizeRequired(courtCase.getDescription(), "Description is required"));
        courtCase.setClientUsername(clientUsername);
        courtCase.setFiledDate(normalizeRequired(courtCase.getFiledDate(), "Filing date is required"));
        courtCase.setLawyerUsername(getCurrentUsername());
        courtCase.setJudgeUsername(null);
        courtCase.setStatus("PENDING");
        caseRepository.save(courtCase);

        return "Case added successfully";
    }

    public List<CourtCase> getAllCases() {
        return caseRepository.findAll();
    }

    public CourtCase getCase(String caseNumber) {
        CourtCase courtCase = getCaseOrThrow(caseNumber);
        Authentication auth = requireAuthentication();
        if (hasRole(auth, "CLIENT")) {
            if (!auth.getName().equals(courtCase.getClientUsername())) {
                throw new AccessDeniedException("Access denied: You can only view your own cases.");
            }
        }
        return courtCase;
    }

    public List<CourtCase> getCasesForLawyer() {
        return caseRepository.findByLawyerUsername(getCurrentUsername());
    }

    public String assignJudge(String caseNumber) {
        CourtCase courtCase = getCaseOrThrow(caseNumber);
        Authentication auth = requireAuthentication();

        if (!hasRole(auth, "JUDGE")) {
            throw new AccessDeniedException("Access denied: Only judges can assign themselves to cases.");
        }

        if ("CLOSED".equalsIgnoreCase(courtCase.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Closed cases cannot be reassigned.");
        }

        if (hasText(courtCase.getJudgeUsername()) && !auth.getName().equals(courtCase.getJudgeUsername())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Case is already assigned to another judge.");
        }

        if (auth.getName().equals(courtCase.getJudgeUsername())) {
            return "Judge already assigned to this case";
        }

        courtCase.setJudgeUsername(auth.getName());
        if ("PENDING".equalsIgnoreCase(courtCase.getStatus())) {
            courtCase.setStatus("IN_PROGRESS");
        }
        caseRepository.save(courtCase);
        return "Judge assigned successfully";
    }

    public String updateCaseStatus(String caseNumber, String status) {
        CourtCase courtCase = getCaseOrThrow(caseNumber);
        Authentication auth = requireAuthentication();

        if (!hasRole(auth, "JUDGE")) {
            throw new AccessDeniedException("Access denied: Only assigned judges can update status.");
        }

        if (!auth.getName().equals(courtCase.getJudgeUsername())) {
            throw new AccessDeniedException("Access denied: You are not assigned to this case.");
        }

        String normalizedStatus = normalizeStatus(status);
        courtCase.setStatus(normalizedStatus);
        caseRepository.save(courtCase);
        return "Case status updated to " + normalizedStatus;
    }

    private CourtCase getCaseOrThrow(String caseNumber) {
        String normalizedCaseNumber = normalizeRequired(caseNumber, "Case number is required");
        return caseRepository.findByCaseNumber(normalizedCaseNumber)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Case not found"));
    }

    private Authentication requireAuthentication() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            throw new AccessDeniedException("Authentication required.");
        }
        return auth;
    }

    private String getCurrentUsername() {
        return requireAuthentication().getName();
    }

    private boolean hasRole(Authentication auth, String role) {
        return auth.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_" + role));
    }

    private String normalizeRequired(String value, String message) {
        if (value == null || value.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return value.trim();
    }

    private String normalizeStatus(String status) {
        String normalizedStatus = normalizeRequired(status, "Status is required").toUpperCase(Locale.ROOT);
        if (!ALLOWED_STATUSES.contains(normalizedStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported status value.");
        }
        return normalizedStatus;
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
