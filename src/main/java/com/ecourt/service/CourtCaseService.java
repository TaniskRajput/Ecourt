package com.ecourt.service;

import com.ecourt.dto.CaseAuditEventResponse;
import com.ecourt.dto.CaseCreateRequest;
import com.ecourt.dto.CaseDocumentResponse;
import com.ecourt.dto.CaseListResponse;
import com.ecourt.dto.CaseResponse;
import com.ecourt.model.CaseAuditEvent;
import com.ecourt.model.CaseDocument;
import com.ecourt.model.CourtCase;
import com.ecourt.model.CaseStatus;
import com.ecourt.model.User;
import com.ecourt.repository.CaseAuditEventRepository;
import com.ecourt.repository.CaseDocumentRepository;
import com.ecourt.repository.CourtCaseRepository;
import com.ecourt.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Business Logic Service for Core Case Management and Workflow Engine.
 * 
 * WHY IT IS USED:
 * This is the intellectual heart of the E-Court application. It encapsulates
 * all domain rules
 * for what happens to a legal profile during its lifecycle. It enforces the
 * Advanced Workflow Engine
 * State Machine (CaseStatus Enum), preventing illegal status jumps. It handles
 * all role-based
 * security validations at the service level (e.g., ensuring a Lawyer cannot
 * magically become a Judge
 * on their own case), integrates with the generic StorageService for documents,
 * and automatically
 * writes immutable audit logs whenever important actions occur.
 *
 * FUNCTIONS OVERVIEW:
 * - addCase: Provisions a new case entity, assigns a unique tracking UUID, and
 * logs the 'Created' event.
 * - getCasesForCurrentUser / searchCases: Dynamically generates scope-aware JPA
 * Queries based on the caller's role.
 * - assignJudge: Validates that the target assignee actually holds the 'JUDGE'
 * role before linking them.
 * - updateCaseStatus: The core State Machine engine. Checks
 * 'previousStatus.canTransitionTo()', throws errors on violation, updates, and
 * writes an Audit log.
 * - uploadDocument: Persists the physical binary via StorageService, records
 * the metadata in the DB, and fires an Audit event.
 * - downloadDocument: Retrieves a document from the underlying storage adapter
 * securely.
 */
@Service
@Transactional
public class CourtCaseService {

    private final CourtCaseRepository caseRepository;
    private final CaseAuditEventRepository caseAuditEventRepository;
    private final CaseDocumentRepository caseDocumentRepository;
    private final UserRepository userRepository;
    private final StorageService storageService;

    public CourtCaseService(
            CourtCaseRepository caseRepository,
            CaseAuditEventRepository caseAuditEventRepository,
            CaseDocumentRepository caseDocumentRepository,
            UserRepository userRepository,
            StorageService storageService) {
        this.caseRepository = caseRepository;
        this.caseAuditEventRepository = caseAuditEventRepository;
        this.caseDocumentRepository = caseDocumentRepository;
        this.userRepository = userRepository;
        this.storageService = storageService;
    }

    public CaseResponse addCase(CaseCreateRequest request) {
        Authentication auth = requireAuthentication();
        String role = getCurrentRole(auth);

        String clientUsername = switch (role) {
            case "CLIENT" -> auth.getName();
            case "ADMIN", "LAWYER" -> validateClientUsername(request.clientUsername());
            default -> throw new AccessDeniedException("Access denied: You cannot create cases.");
        };

        CourtCase courtCase = new CourtCase();
        courtCase.setCaseNumber(generateCaseNumber());
        courtCase.setTitle(normalizeRequired(request.title(), "Title is required"));
        courtCase.setDescription(normalizeRequired(request.description(), "Description is required"));
        courtCase.setClientUsername(clientUsername);
        courtCase.setFiledDate(LocalDate.now());
        courtCase.setLawyerUsername("LAWYER".equals(role) ? auth.getName() : null);
        courtCase.setJudgeUsername(null);
        courtCase.setStatus(CaseStatus.FILED);

        CourtCase savedCase = caseRepository.save(courtCase);
        recordAuditEvent(savedCase, auth.getName(), "CASE_CREATED", "Case created with status FILED.");
        return toResponse(savedCase);
    }

    @Transactional(readOnly = true)
    public List<CaseResponse> getAllCases() {
        return caseRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CaseListResponse searchCases(
            String scope,
            int page,
            int size,
            String clientUsername,
            String status,
            String judgeUsername,
            String lawyerUsername,
            LocalDate filedDate,
            LocalDate filedFrom,
            LocalDate filedTo,
            String query) {
        Authentication auth = requireAuthentication();
        SearchScope resolvedScope = resolveSearchScope(scope, auth);
        Pageable pageable = PageRequest.of(validatePage(page), validateSize(size), Sort.by(
                Sort.Order.desc("filedDate"),
                Sort.Order.desc("createdAt")));

        if (filedDate != null && (filedFrom != null || filedTo != null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Use either filedDate or filedFrom/filedTo filters, not both.");
        }

        if (filedFrom != null && filedTo != null && filedFrom.isAfter(filedTo)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "filedFrom must be on or before filedTo.");
        }

        CaseStatus normalizedStatus = hasText(status) ? normalizeStatus(status) : null;
        String normalizedClientUsername = hasText(clientUsername) ? clientUsername.trim() : null;
        String normalizedJudgeUsername = hasText(judgeUsername) ? judgeUsername.trim() : null;
        String normalizedLawyerUsername = hasText(lawyerUsername) ? lawyerUsername.trim() : null;
        String normalizedQuery = hasText(query) ? query.trim().toLowerCase(Locale.ROOT) : null;

        Page<CaseResponse> result = caseRepository.findAll((root, criteriaQuery, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (resolvedScope == SearchScope.MY) {
                if (hasRole(auth, "CLIENT")) {
                    predicates.add(criteriaBuilder.equal(root.get("clientUsername"), auth.getName()));
                } else if (hasRole(auth, "LAWYER")) {
                    predicates.add(criteriaBuilder.equal(root.get("lawyerUsername"), auth.getName()));
                } else if (hasRole(auth, "JUDGE")) {
                    predicates.add(criteriaBuilder.equal(root.get("judgeUsername"), auth.getName()));
                }
            }

            if (normalizedClientUsername != null) {
                predicates.add(criteriaBuilder.equal(root.get("clientUsername"), normalizedClientUsername));
            }

            if (normalizedStatus != null) {
                predicates.add(criteriaBuilder.equal(root.get("status"), normalizedStatus));
            }

            if (normalizedJudgeUsername != null) {
                predicates.add(criteriaBuilder.equal(root.get("judgeUsername"), normalizedJudgeUsername));
            }

            if (normalizedLawyerUsername != null) {
                predicates.add(criteriaBuilder.equal(root.get("lawyerUsername"), normalizedLawyerUsername));
            }

            if (filedDate != null) {
                predicates.add(criteriaBuilder.equal(root.get("filedDate"), filedDate));
            } else {
                if (filedFrom != null) {
                    predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("filedDate"), filedFrom));
                }
                if (filedTo != null) {
                    predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("filedDate"), filedTo));
                }
            }

            if (normalizedQuery != null) {
                String pattern = "%" + normalizedQuery + "%";
                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("caseNumber")), pattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("title")), pattern)));
            }

            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        }, pageable).map(this::toResponse);

        return new CaseListResponse(
                result.getContent(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages());
    }

    @Transactional(readOnly = true)
    public CaseResponse getCase(String caseNumber) {
        CourtCase courtCase = getCaseOrThrow(caseNumber);
        assertCaseAccess(courtCase, requireAuthentication());
        return toResponse(courtCase);
    }

    @Transactional(readOnly = true)
    public List<CaseResponse> getCasesForCurrentUser() {
        Authentication auth = requireAuthentication();

        if (hasRole(auth, "CLIENT")) {
            return caseRepository.findByClientUsername(auth.getName()).stream()
                    .map(this::toResponse)
                    .toList();
        }

        if (hasRole(auth, "LAWYER")) {
            return caseRepository.findByLawyerUsername(auth.getName()).stream()
                    .map(this::toResponse)
                    .toList();
        }

        if (hasRole(auth, "JUDGE")) {
            return caseRepository.findByJudgeUsername(auth.getName()).stream()
                    .map(this::toResponse)
                    .toList();
        }

        throw new AccessDeniedException(
                "Access denied: This endpoint is only available for client, lawyer, or judge accounts.");
    }

    public String assignJudge(String caseNumber, String requestedJudgeUsername) {
        CourtCase courtCase = getCaseOrThrow(caseNumber);
        Authentication auth = requireAuthentication();
        String targetJudgeUsername;

        if (hasRole(auth, "ADMIN")) {
            targetJudgeUsername = validateJudgeUsername(requestedJudgeUsername);
        } else if (hasRole(auth, "JUDGE")) {
            if (hasText(requestedJudgeUsername) && !auth.getName().equals(requestedJudgeUsername.trim())) {
                throw new AccessDeniedException("Access denied: Judges can only assign themselves to cases.");
            }
            targetJudgeUsername = auth.getName();
        } else {
            throw new AccessDeniedException("Access denied: Only admins or judges can assign judges to cases.");
        }

        if (CaseStatus.CLOSED == courtCase.getStatus()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Closed cases cannot be reassigned.");
        }

        if (hasText(courtCase.getJudgeUsername()) && !targetJudgeUsername.equals(courtCase.getJudgeUsername())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Case is already assigned to another judge.");
        }

        if (targetJudgeUsername.equals(courtCase.getJudgeUsername())) {
            return "Judge already assigned to this case";
        }

        courtCase.setJudgeUsername(targetJudgeUsername);
        if (CaseStatus.FILED == courtCase.getStatus()) {
            courtCase.setStatus(CaseStatus.SCRUTINY);
        }
        caseRepository.save(courtCase);
        return "Judge assigned successfully";
    }

    public String updateCaseStatus(String caseNumber, String status) {
        CourtCase courtCase = getCaseOrThrow(caseNumber);
        Authentication auth = requireAuthentication();
        CaseStatus previousStatus = courtCase.getStatus();

        if (!hasRole(auth, "ADMIN")) {
            if (!hasRole(auth, "JUDGE")) {
                throw new AccessDeniedException("Access denied: Only admins or assigned judges can update status.");
            }
            if (!auth.getName().equals(courtCase.getJudgeUsername())) {
                throw new AccessDeniedException("Access denied: You are not assigned to this case.");
            }
        }

        CaseStatus normalizedStatus = normalizeStatus(status);
        if (!previousStatus.canTransitionTo(normalizedStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid status transition from " + previousStatus + " to " + normalizedStatus + ".");
        }

        courtCase.setStatus(normalizedStatus);
        caseRepository.save(courtCase);
        if (previousStatus != normalizedStatus) {
            recordAuditEvent(
                    courtCase,
                    auth.getName(),
                    "CASE_STATUS_UPDATED",
                    "Status changed from " + previousStatus + " to " + normalizedStatus + ".");
        }
        return "Case status updated to " + normalizedStatus;
    }

    public CaseDocumentResponse uploadDocument(String caseNumber, MultipartFile file) {
        CourtCase courtCase = getCaseOrThrow(caseNumber);
        Authentication auth = requireAuthentication();
        assertCaseAccess(courtCase, auth);

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Document file is required.");
        }

        StorageService.StoredFile storedFile = storageService.store(file);

        CaseDocument document = new CaseDocument();
        document.setCourtCase(courtCase);
        document.setOriginalFilename(storedFile.originalFilename());
        document.setStoredFilename(storedFile.storedFilename());
        document.setContentType(storedFile.contentType());
        document.setSizeBytes(storedFile.sizeBytes());
        document.setUploadedBy(auth.getName());

        CaseDocument savedDocument = caseDocumentRepository.save(document);
        recordAuditEvent(
                courtCase,
                auth.getName(),
                "DOCUMENT_UPLOADED",
                "Uploaded document: " + savedDocument.getOriginalFilename() + ".");
        return toDocumentResponse(savedDocument);
    }

    @Transactional(readOnly = true)
    public List<CaseDocumentResponse> getDocuments(String caseNumber) {
        CourtCase courtCase = getCaseOrThrow(caseNumber);
        assertCaseAccess(courtCase, requireAuthentication());

        return caseDocumentRepository.findByCourtCaseIdOrderByUploadedAtDesc(courtCase.getId()).stream()
                .map(this::toDocumentResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CaseAuditEventResponse> getAuditEvents(String caseNumber) {
        CourtCase courtCase = getCaseOrThrow(caseNumber);
        assertCaseAccess(courtCase, requireAuthentication());

        return caseAuditEventRepository.findByCourtCaseIdOrderByOccurredAtDesc(courtCase.getId()).stream()
                .map(this::toAuditResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public DocumentDownload downloadDocument(String caseNumber, Long documentId) {
        CourtCase courtCase = getCaseOrThrow(caseNumber);
        assertCaseAccess(courtCase, requireAuthentication());

        CaseDocument document = caseDocumentRepository.findByIdAndCourtCaseId(documentId, courtCase.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        return new DocumentDownload(
                storageService.loadAsResource(document.getStoredFilename()),
                document.getOriginalFilename(),
                document.getContentType());
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

    private String getCurrentRole(Authentication auth) {
        if (hasRole(auth, "ADMIN")) {
            return "ADMIN";
        }
        if (hasRole(auth, "CLIENT")) {
            return "CLIENT";
        }
        if (hasRole(auth, "LAWYER")) {
            return "LAWYER";
        }
        if (hasRole(auth, "JUDGE")) {
            return "JUDGE";
        }
        throw new AccessDeniedException("Access denied: Unsupported role.");
    }

    private void assertCaseAccess(CourtCase courtCase, Authentication auth) {
        if (hasRole(auth, "ADMIN")) {
            return;
        }

        if (hasRole(auth, "CLIENT") && auth.getName().equals(courtCase.getClientUsername())) {
            return;
        }

        if (hasRole(auth, "LAWYER") && auth.getName().equals(courtCase.getLawyerUsername())) {
            return;
        }

        if (hasRole(auth, "JUDGE") && auth.getName().equals(courtCase.getJudgeUsername())) {
            return;
        }

        throw new AccessDeniedException("Access denied: You do not have permission to access this case.");
    }

    private String validateClientUsername(String username) {
        String normalized = normalizeRequired(username, "Client username is required");
        User client = userRepository.findByUsername(normalized)
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Client username does not exist."));

        if (!"CLIENT".equalsIgnoreCase(client.getRole())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provided user is not a client.");
        }

        if (!client.isActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provided client account is inactive.");
        }

        return normalized;
    }

    private String validateJudgeUsername(String username) {
        String normalized = normalizeRequired(username, "Judge username is required");
        User judge = userRepository.findByUsername(normalized)
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Judge username does not exist."));

        if (!"JUDGE".equalsIgnoreCase(judge.getRole())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provided user is not a judge.");
        }

        if (!judge.isActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provided judge account is inactive.");
        }

        return normalized;
    }

    private String normalizeRequired(String value, String message) {
        if (value == null || value.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return value.trim();
    }

    private CaseStatus normalizeStatus(String status) {
        String trimmed = normalizeRequired(status, "Status is required").toUpperCase(Locale.ROOT);
        try {
            return CaseStatus.valueOf(trimmed);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported status value.");
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private SearchScope resolveSearchScope(String scope, Authentication auth) {
        String normalizedScope = hasText(scope) ? scope.trim().toUpperCase(Locale.ROOT) : "MY";

        if (!normalizedScope.equals("MY") && !normalizedScope.equals("ALL")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Scope must be either 'my' or 'all'.");
        }

        if (normalizedScope.equals("ALL")) {
            if (!hasRole(auth, "ADMIN") && !hasRole(auth, "JUDGE")) {
                throw new AccessDeniedException("Access denied: Only admins or judges can search across all cases.");
            }
            return SearchScope.ALL;
        }

        return SearchScope.MY;
    }

    private int validatePage(int page) {
        if (page < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page index must be zero or greater.");
        }
        return page;
    }

    private int validateSize(int size) {
        if (size < 1 || size > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page size must be between 1 and 100.");
        }
        return size;
    }

    private String generateCaseNumber() {
        String candidate;
        do {
            candidate = "ECOURT-" + LocalDate.now() + "-"
                    + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        } while (caseRepository.findByCaseNumber(candidate).isPresent());

        return candidate;
    }

    private CaseResponse toResponse(CourtCase courtCase) {
        List<CaseDocumentResponse> documents = caseDocumentRepository
                .findByCourtCaseIdOrderByUploadedAtDesc(courtCase.getId())
                .stream()
                .map(this::toDocumentResponse)
                .toList();

        return new CaseResponse(
                courtCase.getCaseNumber(),
                courtCase.getTitle(),
                courtCase.getDescription(),
                courtCase.getStatus(),
                courtCase.getFiledDate(),
                courtCase.getClientUsername(),
                courtCase.getLawyerUsername(),
                courtCase.getJudgeUsername(),
                courtCase.getCreatedAt(),
                courtCase.getUpdatedAt(),
                documents);
    }

    private CaseDocumentResponse toDocumentResponse(CaseDocument document) {
        return new CaseDocumentResponse(
                document.getId(),
                document.getOriginalFilename(),
                document.getContentType(),
                document.getSizeBytes(),
                document.getUploadedBy(),
                document.getUploadedAt());
    }

    private CaseAuditEventResponse toAuditResponse(CaseAuditEvent event) {
        return new CaseAuditEventResponse(
                event.getId(),
                event.getEventType(),
                event.getActorUsername(),
                event.getDetails(),
                event.getOccurredAt());
    }

    private void recordAuditEvent(CourtCase courtCase, String actorUsername, String eventType, String details) {
        CaseAuditEvent event = new CaseAuditEvent();
        event.setCourtCase(courtCase);
        event.setActorUsername(actorUsername);
        event.setEventType(eventType);
        event.setDetails(details);
        caseAuditEventRepository.save(event);
    }

    public record DocumentDownload(
            org.springframework.core.io.Resource resource,
            String originalFilename,
            String contentType) {
    }

    private enum SearchScope {
        MY,
        ALL
    }
}
