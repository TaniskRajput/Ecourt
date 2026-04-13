package com.ecourt.service;

import com.ecourt.dto.CaseAuditEventResponse;
import com.ecourt.dto.CaseCreateRequest;
import com.ecourt.dto.CaseDocumentResponse;
import com.ecourt.dto.CaseInsightResponse;
import com.ecourt.dto.CaseListResponse;
import com.ecourt.dto.CaseResponse;
import com.ecourt.dto.DashboardSummaryResponse;
import com.ecourt.dto.HearingCreateRequest;
import com.ecourt.dto.HearingResponse;
import com.ecourt.dto.PublicCaseSearchItemResponse;
import com.ecourt.dto.PublicCaseTrackDetailResponse;
import com.ecourt.model.CaseAuditEvent;
import com.ecourt.model.CaseDocument;
import com.ecourt.model.CourtCase;
import com.ecourt.model.CaseStatus;
import com.ecourt.model.DocumentCategory;
import com.ecourt.model.HearingRecord;
import com.ecourt.model.User;
import com.ecourt.repository.CaseAuditEventRepository;
import com.ecourt.repository.CaseDocumentRepository;
import com.ecourt.repository.CourtCaseRepository;
import com.ecourt.repository.HearingRecordRepository;
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

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
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
    private final HearingRecordRepository hearingRecordRepository;
    private final UserRepository userRepository;
    private final StorageService storageService;
    private final NotificationService notificationService;
    private final CaseInsightService caseInsightService;

    public CourtCaseService(
            CourtCaseRepository caseRepository,
            CaseAuditEventRepository caseAuditEventRepository,
            CaseDocumentRepository caseDocumentRepository,
            HearingRecordRepository hearingRecordRepository,
            UserRepository userRepository,
            StorageService storageService,
            NotificationService notificationService,
            CaseInsightService caseInsightService) {
        this.caseRepository = caseRepository;
        this.caseAuditEventRepository = caseAuditEventRepository;
        this.caseDocumentRepository = caseDocumentRepository;
        this.hearingRecordRepository = hearingRecordRepository;
        this.userRepository = userRepository;
        this.storageService = storageService;
        this.notificationService = notificationService;
        this.caseInsightService = caseInsightService;
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
        courtCase.setCourtName(normalizeOptional(request.courtName()));
        courtCase.setTitle(normalizeRequired(request.title(), "Title is required"));
        courtCase.setDescription(normalizeRequired(request.description(), "Description is required"));
        courtCase.setClientUsername(clientUsername);
        courtCase.setFiledDate(LocalDate.now());
        courtCase.setLawyerUsername("LAWYER".equals(role) ? auth.getName() : null);
        courtCase.setJudgeUsername(null);
        courtCase.setStatus(CaseStatus.FILED);

        CourtCase savedCase = caseRepository.save(courtCase);
        String details = switch (role) {
            case "CLIENT" -> "Case created with status FILED by client " + auth.getName() + ".";
            case "LAWYER" -> "Case created with status FILED by lawyer " + auth.getName()
                    + " for client " + clientUsername + ".";
            case "ADMIN" -> "Case created with status FILED by admin " + auth.getName()
                    + " for client " + clientUsername + ".";
            default -> "Case created with status FILED.";
        };
        recordAuditEvent(savedCase, auth.getName(), "CASE_CREATED", details);
        notifyCaseParticipants(
                savedCase,
                auth.getName(),
                "CASE_CREATED",
                "Case filed: " + savedCase.getCaseNumber(),
                buildCaseCreatedMessage(savedCase, role, auth.getName()));
        return toResponse(savedCase);
    }

    @Transactional(readOnly = true)
    public List<CaseResponse> getAllCases() {
        return caseRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public DashboardSummaryResponse getDashboardSummary() {
        Authentication auth = requireAuthentication();
        String role = getCurrentRole(auth);
        List<CourtCase> visibleCases = getVisibleCases(auth, role);
        List<CourtCase> assignedCases = "JUDGE".equals(role)
                ? caseRepository.findByJudgeUsername(auth.getName())
                : visibleCases;

        long activeCases = visibleCases.stream()
                .filter(courtCase -> courtCase.getStatus() != CaseStatus.CLOSED)
                .count();
        long closedCases = visibleCases.stream()
                .filter(courtCase -> courtCase.getStatus() == CaseStatus.CLOSED)
                .count();
        long unassignedCases = visibleCases.stream()
                .filter(courtCase -> !hasText(courtCase.getJudgeUsername()))
                .count();
        long pendingActions = switch (role) {
            case "JUDGE" -> assignedCases.stream()
                    .filter(courtCase -> courtCase.getStatus() != CaseStatus.CLOSED)
                    .count();
            case "ADMIN" -> visibleCases.stream()
                    .filter(courtCase -> !hasText(courtCase.getJudgeUsername()) || courtCase.getStatus() != CaseStatus.CLOSED)
                    .count();
            default -> visibleCases.stream()
                    .filter(courtCase -> courtCase.getStatus() != CaseStatus.CLOSED)
                    .count();
        };

        List<CaseResponse> recentCases = visibleCases.stream()
                .sorted(Comparator.comparing(CourtCase::getUpdatedAt).reversed())
                .limit(6)
                .map(this::toResponse)
                .toList();

        List<CaseAuditEventResponse> recentActions = visibleCases.stream()
                .flatMap(courtCase -> caseAuditEventRepository.findByCourtCaseIdOrderByOccurredAtDesc(courtCase.getId())
                        .stream())
                .map(this::toAuditResponse)
                .sorted(Comparator.comparing(CaseAuditEventResponse::occurredAt).reversed())
                .limit(8)
                .toList();

        long totalUsers = 0;
        long activeJudges = 0;
        if ("ADMIN".equals(role)) {
            List<User> users = userRepository.findAll();
            totalUsers = users.size();
            activeJudges = users.stream()
                    .filter(user -> "JUDGE".equalsIgnoreCase(user.getRole()) && user.isActive())
                    .count();
        }

        return new DashboardSummaryResponse(
                role,
                visibleCases.size(),
                activeCases,
                closedCases,
                unassignedCases,
                pendingActions,
                totalUsers,
                activeJudges,
                recentCases,
                recentActions);
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
            String query,
            String sortBy,
            String direction) {
        Authentication auth = requireAuthentication();
        SearchScope resolvedScope = resolveSearchScope(scope, auth);
        Pageable pageable = PageRequest.of(validatePage(page), validateSize(size), resolveSort(sortBy, direction));

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
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("title")), pattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("clientUsername")), pattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("lawyerUsername")), pattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("judgeUsername")), pattern)));
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
        assertCaseReadAccess(courtCase, requireAuthentication());
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
        CaseStatus previousStatus = courtCase.getStatus();
        if (CaseStatus.FILED == courtCase.getStatus()) {
            courtCase.setStatus(CaseStatus.SCRUTINY);
        }
        caseRepository.save(courtCase);
        String assignmentSource = hasRole(auth, "ADMIN")
                ? "Judge " + targetJudgeUsername + " assigned by admin " + auth.getName() + "."
                : "Judge " + targetJudgeUsername + " self-assigned this case.";
        String statusNote = previousStatus != courtCase.getStatus()
                ? " Status moved from " + previousStatus + " to " + courtCase.getStatus() + "."
                : "";
        recordAuditEvent(courtCase, auth.getName(), "JUDGE_ASSIGNED", assignmentSource + statusNote);
        notifyCaseParticipants(
                courtCase,
                auth.getName(),
                "JUDGE_ASSIGNED",
                "Judge assigned for " + courtCase.getCaseNumber(),
                "Case " + courtCase.getCaseNumber() + " was assigned to judge " + targetJudgeUsername
                        + " by " + auth.getName() + ". Current status: " + courtCase.getStatus() + ".");
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
            String eventType = normalizedStatus == CaseStatus.CLOSED ? "CASE_CLOSED" : "CASE_STATUS_UPDATED";
            recordAuditEvent(
                    courtCase,
                    auth.getName(),
                    eventType,
                    "Status changed from " + previousStatus + " to " + normalizedStatus + ".");
            notifyCaseParticipants(
                    courtCase,
                    auth.getName(),
                    eventType,
                    "Case status updated: " + courtCase.getCaseNumber(),
                    "Case " + courtCase.getCaseNumber() + " moved from " + previousStatus + " to "
                            + normalizedStatus + " by " + auth.getName() + ".");
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
        document.setCategory(DocumentCategory.EVIDENCE);
        document.setDocumentTitle(storedFile.originalFilename());

        CaseDocument savedDocument = caseDocumentRepository.save(document);
        recordAuditEvent(
                courtCase,
                auth.getName(),
                "DOCUMENT_UPLOADED",
                "Uploaded document: " + savedDocument.getOriginalFilename() + ".");
        notifyCaseParticipants(
                courtCase,
                auth.getName(),
                "DOCUMENT_UPLOADED",
                "New document on " + courtCase.getCaseNumber(),
                auth.getName() + " uploaded \"" + savedDocument.getOriginalFilename() + "\" to case "
                        + courtCase.getCaseNumber() + ".");
        return toDocumentResponse(savedDocument);
    }

    @Transactional(readOnly = true)
    public List<CaseDocumentResponse> getDocuments(String caseNumber) {
        CourtCase courtCase = getCaseOrThrow(caseNumber);
        assertCaseReadAccess(courtCase, requireAuthentication());

        return getEvidenceDocuments(courtCase).stream()
                .map(this::toDocumentResponse)
                .toList();
    }

    public HearingResponse addHearing(String caseNumber, HearingCreateRequest request) {
        CourtCase courtCase = getCaseOrThrow(caseNumber);
        Authentication auth = requireAuthentication();
        assertCaseManagementAccess(courtCase, auth);

        HearingRecord hearing = new HearingRecord();
        hearing.setCourtCase(courtCase);
        hearing.setHearingDate(request.hearingDate());
        hearing.setNextHearingDate(request.nextHearingDate());
        hearing.setJudgeName(resolveHearingJudgeName(courtCase, auth, request.judgeName()));
        hearing.setRemarks(normalizeRequired(request.remarks(), "Remarks are required"));
        hearing.setCreatedBy(auth.getName());

        HearingRecord savedHearing = hearingRecordRepository.save(hearing);
        recordAuditEvent(
                courtCase,
                auth.getName(),
                "HEARING_ADDED",
                "Hearing added for " + request.hearingDate() + " by " + savedHearing.getJudgeName() + ".");
        notifyCaseParticipants(
                courtCase,
                auth.getName(),
                "HEARING_ADDED",
                "New hearing recorded for " + courtCase.getCaseNumber(),
                "A hearing dated " + request.hearingDate() + " was recorded for case "
                        + courtCase.getCaseNumber() + ".");

        if (courtCase.getStatus() == CaseStatus.SCRUTINY) {
            courtCase.setStatus(CaseStatus.HEARING);
            caseRepository.save(courtCase);
            recordAuditEvent(
                    courtCase,
                    auth.getName(),
                    "CASE_STATUS_UPDATED",
                    "Status changed from SCRUTINY to HEARING.");
        }

        return toHearingResponse(savedHearing);
    }

    @Transactional(readOnly = true)
    public List<HearingResponse> getHearings(String caseNumber) {
        CourtCase courtCase = getCaseOrThrow(caseNumber);
        assertCaseReadAccess(courtCase, requireAuthentication());
        return getHearingHistory(courtCase).stream()
                .map(this::toHearingResponse)
                .toList();
    }

    public CaseDocumentResponse uploadOrder(
            String caseNumber,
            String orderTitle,
            String orderType,
            LocalDate orderDate,
            MultipartFile file) {
        CourtCase courtCase = getCaseOrThrow(caseNumber);
        Authentication auth = requireAuthentication();
        assertCaseManagementAccess(courtCase, auth);

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order PDF is required.");
        }

        StorageService.StoredFile storedFile = storageService.store(file);

        CaseDocument document = new CaseDocument();
        document.setCourtCase(courtCase);
        document.setOriginalFilename(storedFile.originalFilename());
        document.setStoredFilename(storedFile.storedFilename());
        document.setContentType(storedFile.contentType());
        document.setSizeBytes(storedFile.sizeBytes());
        document.setUploadedBy(auth.getName());
        document.setCategory(DocumentCategory.ORDER);
        document.setDocumentTitle(resolveOrderTitle(orderTitle, storedFile.originalFilename()));
        document.setOrderType(normalizeRequired(orderType, "Order type is required"));
        document.setOrderDate((orderDate == null ? LocalDate.now() : orderDate).atStartOfDay()
                .atZone(java.time.ZoneId.systemDefault())
                .toInstant());

        CaseDocument savedDocument = caseDocumentRepository.save(document);
        recordAuditEvent(
                courtCase,
                auth.getName(),
                "ORDER_UPLOADED",
                "Order uploaded: " + savedDocument.getDocumentTitle() + ".");
        notifyCaseParticipants(
                courtCase,
                auth.getName(),
                "ORDER_UPLOADED",
                "Court order uploaded for " + courtCase.getCaseNumber(),
                auth.getName() + " uploaded order \"" + savedDocument.getDocumentTitle() + "\" for case "
                        + courtCase.getCaseNumber() + ".");

        if (courtCase.getStatus() == CaseStatus.ARGUMENT) {
            courtCase.setStatus(CaseStatus.JUDGMENT);
            caseRepository.save(courtCase);
            recordAuditEvent(
                    courtCase,
                    auth.getName(),
                    "CASE_STATUS_UPDATED",
                    "Status changed from ARGUMENT to JUDGMENT.");
        }

        return toDocumentResponse(savedDocument);
    }

    @Transactional(readOnly = true)
    public List<CaseDocumentResponse> getOrders(String caseNumber) {
        CourtCase courtCase = getCaseOrThrow(caseNumber);
        assertCaseReadAccess(courtCase, requireAuthentication());
        return getOrderDocuments(courtCase).stream()
                .map(this::toDocumentResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PublicCaseSearchItemResponse> searchPublicCases(String caseNumber, Integer year, String courtName) {
        String normalizedCaseNumber = normalizeOptional(caseNumber);
        String normalizedCourtName = normalizeOptional(courtName);

        if (!hasText(normalizedCaseNumber) && year == null && !hasText(normalizedCourtName)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Provide a case number, year, or court name to search.");
        }

        return caseRepository.findAll((root, criteriaQuery, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (hasText(normalizedCaseNumber)) {
                String pattern = "%" + normalizedCaseNumber.toLowerCase(Locale.ROOT) + "%";
                predicates.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("caseNumber")), pattern));
            }

            if (year != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(
                        root.get("filedDate"),
                        LocalDate.of(year, 1, 1)));
                predicates.add(criteriaBuilder.lessThanOrEqualTo(
                        root.get("filedDate"),
                        LocalDate.of(year, 12, 31)));
            }

            if (hasText(normalizedCourtName)) {
                String pattern = "%" + normalizedCourtName.toLowerCase(Locale.ROOT) + "%";
                predicates.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("courtName")), pattern));
            }

            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        }, Sort.by(Sort.Direction.DESC, "updatedAt")).stream()
                .limit(12)
                .map(this::toPublicSearchItem)
                .toList();
    }

    @Transactional(readOnly = true)
    public PublicCaseTrackDetailResponse getPublicCaseTrackingDetail(String caseNumber) {
        CourtCase courtCase = getCaseOrThrow(caseNumber);
        return new PublicCaseTrackDetailResponse(
                courtCase.getCaseNumber(),
                courtCase.getTitle(),
                courtCase.getDescription(),
                courtCase.getCourtName(),
                courtCase.getStatus(),
                courtCase.getFiledDate(),
                courtCase.getClientUsername(),
                courtCase.getLawyerUsername(),
                courtCase.getJudgeUsername(),
                courtCase.getUpdatedAt(),
                getHearingHistory(courtCase).stream().map(this::toHearingResponse).toList(),
                getOrderDocuments(courtCase).stream().map(this::toDocumentResponse).toList());
    }

    @Transactional(readOnly = true)
    public DocumentDownload downloadPublicOrder(String caseNumber, Long documentId) {
        CourtCase courtCase = getCaseOrThrow(caseNumber);
        CaseDocument document = caseDocumentRepository
                .findByIdAndCourtCaseIdAndCategory(documentId, courtCase.getId(), DocumentCategory.ORDER)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order document not found"));

        return new DocumentDownload(
                storageService.loadAsResource(document.getStoredFilename()),
                document.getOriginalFilename(),
                document.getContentType());
    }

    @Transactional(readOnly = true)
    public List<CaseAuditEventResponse> getAuditEvents(String caseNumber) {
        CourtCase courtCase = getCaseOrThrow(caseNumber);
        assertCaseReadAccess(courtCase, requireAuthentication());

        return caseAuditEventRepository.findByCourtCaseIdOrderByOccurredAtDesc(courtCase.getId()).stream()
                .map(this::toAuditResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public DocumentDownload downloadDocument(String caseNumber, Long documentId) {
        CourtCase courtCase = getCaseOrThrow(caseNumber);
        assertCaseReadAccess(courtCase, requireAuthentication());

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
        if (!hasCaseAccess(courtCase, auth)) {
            throw new AccessDeniedException("Access denied: You do not have permission to access this case.");
        }
    }

    private void assertCaseReadAccess(CourtCase courtCase, Authentication auth) {
        if (!hasCaseReadAccess(courtCase, auth)) {
            throw new AccessDeniedException("Access denied: You do not have permission to access this case.");
        }
    }

    private boolean hasCaseReadAccess(CourtCase courtCase, Authentication auth) {
        if (hasRole(auth, "ADMIN")) {
            return true;
        }

        if (hasRole(auth, "CLIENT") && auth.getName().equals(courtCase.getClientUsername())) {
            return true;
        }

        if (hasRole(auth, "LAWYER") && auth.getName().equals(courtCase.getLawyerUsername())) {
            return true;
        }

        if (hasRole(auth, "JUDGE")) {
            return true;
        }

        return false;
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

    private String normalizeOptional(String value) {
        return hasText(value) ? value.trim() : null;
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

    private Sort resolveSort(String sortBy, String direction) {
        String normalizedSortBy = hasText(sortBy) ? sortBy.trim().toLowerCase(Locale.ROOT) : "fileddate";
        String property = switch (normalizedSortBy) {
            case "casenumber", "case_number" -> "caseNumber";
            case "title" -> "title";
            case "client", "clientusername", "party" -> "clientUsername";
            case "lawyer", "lawyerusername" -> "lawyerUsername";
            case "judge", "judgeusername" -> "judgeUsername";
            case "status" -> "status";
            case "updatedat", "updated_at" -> "updatedAt";
            case "createdat", "created_at" -> "createdAt";
            case "fileddate", "filed_date" -> "filedDate";
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported sortBy value.");
        };

        String normalizedDirection = hasText(direction) ? direction.trim().toLowerCase(Locale.ROOT) : "desc";
        Sort.Direction resolvedDirection = switch (normalizedDirection) {
            case "asc" -> Sort.Direction.ASC;
            case "desc" -> Sort.Direction.DESC;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "direction must be 'asc' or 'desc'.");
        };

        return Sort.by(
                new Sort.Order(resolvedDirection, property),
                new Sort.Order(Sort.Direction.DESC, "updatedAt"));
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
        // Load hearing history once so both the normal case payload and the forecast logic
        // can reuse the same data without repeating repository work.
        List<HearingRecord> hearingHistory = getHearingHistory(courtCase);
        List<CaseDocumentResponse> documents = getEvidenceDocuments(courtCase).stream()
                .map(this::toDocumentResponse)
                .toList();
        List<CaseDocumentResponse> orderDocuments = getOrderDocuments(courtCase).stream()
                .map(this::toDocumentResponse)
                .toList();
        List<HearingResponse> hearings = hearingHistory.stream()
                .map(this::toHearingResponse)
                .toList();
        // Build the prediction object that powers the AI Insight card in the React UI.
        CaseInsightResponse insight = caseInsightService.buildInsight(courtCase, hearingHistory);
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean canAssignJudge = canAssignJudge(courtCase, auth);
        boolean canUpdateStatus = canUpdateStatus(courtCase, auth);
        boolean canUploadDocuments = canUploadDocuments(courtCase, auth);
        boolean canManageHearings = canManageHearings(courtCase, auth);
        boolean canManageOrders = canManageOrders(courtCase, auth);
        List<CaseStatus> allowedNextStatuses = canUpdateStatus
                ? courtCase.getStatus().getAllowedTransitions().stream()
                        .sorted(Comparator.comparingInt(Enum::ordinal))
                        .toList()
                : List.of();

        return new CaseResponse(
                courtCase.getCaseNumber(),
                courtCase.getTitle(),
                courtCase.getDescription(),
                courtCase.getCourtName(),
                courtCase.getStatus(),
                courtCase.getFiledDate(),
                courtCase.getClientUsername(),
                courtCase.getLawyerUsername(),
                courtCase.getJudgeUsername(),
                courtCase.getCreatedAt(),
                courtCase.getUpdatedAt(),
                documents,
                hearings,
                orderDocuments,
                // Include forecast data in the main case response so the frontend gets everything in one API call.
                insight,
                allowedNextStatuses,
                canAssignJudge,
                canUpdateStatus,
                canUploadDocuments,
                canManageHearings,
                canManageOrders);
    }

    private CaseDocumentResponse toDocumentResponse(CaseDocument document) {
        DocumentCategory category = document.getCategory() == null ? DocumentCategory.EVIDENCE : document.getCategory();
        return new CaseDocumentResponse(
                document.getId(),
                category.name(),
                document.getDocumentTitle(),
                document.getOrderType(),
                document.getOrderDate(),
                document.getOriginalFilename(),
                document.getContentType(),
                document.getSizeBytes(),
                document.getUploadedBy(),
                document.getUploadedAt());
    }

    private HearingResponse toHearingResponse(HearingRecord hearing) {
        return new HearingResponse(
                hearing.getId(),
                hearing.getHearingDate(),
                hearing.getNextHearingDate(),
                hearing.getJudgeName(),
                hearing.getRemarks(),
                hearing.getCreatedBy(),
                hearing.getCreatedAt());
    }

    private PublicCaseSearchItemResponse toPublicSearchItem(CourtCase courtCase) {
        return new PublicCaseSearchItemResponse(
                courtCase.getCaseNumber(),
                courtCase.getTitle(),
                courtCase.getCourtName(),
                courtCase.getStatus(),
                courtCase.getFiledDate(),
                courtCase.getUpdatedAt(),
                buildPublicCaseSummary(courtCase));
    }

    private CaseAuditEventResponse toAuditResponse(CaseAuditEvent event) {
        return new CaseAuditEventResponse(
                event.getId(),
                event.getEventType(),
                event.getActorUsername(),
                event.getDetails(),
                event.getOccurredAt());
    }

    private boolean canAssignJudge(CourtCase courtCase, Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return false;
        }
        if (hasRole(auth, "ADMIN")) {
            return courtCase.getStatus() != CaseStatus.CLOSED;
        }
        return hasRole(auth, "JUDGE")
                && courtCase.getStatus() != CaseStatus.CLOSED
                && (!hasText(courtCase.getJudgeUsername()) || auth.getName().equals(courtCase.getJudgeUsername()));
    }

    private boolean canUpdateStatus(CourtCase courtCase, Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return false;
        }
        if (hasRole(auth, "ADMIN")) {
            return courtCase.getStatus() != CaseStatus.CLOSED;
        }
        return hasRole(auth, "JUDGE")
                && auth.getName().equals(courtCase.getJudgeUsername())
                && courtCase.getStatus() != CaseStatus.CLOSED;
    }

    private boolean canUploadDocuments(CourtCase courtCase, Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return false;
        }
        return hasCaseAccess(courtCase, auth);
    }

    private boolean canManageHearings(CourtCase courtCase, Authentication auth) {
        return canManageCaseProceedings(courtCase, auth);
    }

    private boolean canManageOrders(CourtCase courtCase, Authentication auth) {
        return canManageCaseProceedings(courtCase, auth);
    }

    private boolean canManageCaseProceedings(CourtCase courtCase, Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return false;
        }
        return hasRole(auth, "ADMIN")
                || (hasRole(auth, "JUDGE") && auth.getName().equals(courtCase.getJudgeUsername()));
    }

    private boolean hasCaseAccess(CourtCase courtCase, Authentication auth) {
        return hasRole(auth, "ADMIN")
                || (hasRole(auth, "CLIENT") && auth.getName().equals(courtCase.getClientUsername()))
                || (hasRole(auth, "LAWYER") && auth.getName().equals(courtCase.getLawyerUsername()))
                || (hasRole(auth, "JUDGE") && auth.getName().equals(courtCase.getJudgeUsername()));
    }

    private List<CourtCase> getVisibleCases(Authentication auth, String role) {
        return switch (role) {
            case "ADMIN" -> caseRepository.findAll();
            case "JUDGE" -> caseRepository.findAll();
            case "CLIENT" -> caseRepository.findByClientUsername(auth.getName());
            case "LAWYER" -> caseRepository.findByLawyerUsername(auth.getName());
            default -> List.of();
        };
    }

    private void recordAuditEvent(CourtCase courtCase, String actorUsername, String eventType, String details) {
        CaseAuditEvent event = new CaseAuditEvent();
        event.setCourtCase(courtCase);
        event.setActorUsername(actorUsername);
        event.setEventType(eventType);
        event.setDetails(details);
        caseAuditEventRepository.save(event);
    }

    private void assertCaseManagementAccess(CourtCase courtCase, Authentication auth) {
        if (!canManageCaseProceedings(courtCase, auth)) {
            throw new AccessDeniedException("Access denied: Only admins or the assigned judge can manage hearings and orders.");
        }
    }

    private String resolveHearingJudgeName(CourtCase courtCase, Authentication auth, String judgeName) {
        if (hasText(judgeName)) {
            return judgeName.trim();
        }
        if (hasText(courtCase.getJudgeUsername())) {
            return courtCase.getJudgeUsername();
        }
        return auth.getName();
    }

    private String resolveOrderTitle(String orderTitle, String fallbackFilename) {
        return hasText(orderTitle) ? orderTitle.trim() : fallbackFilename;
    }

    private List<CaseDocument> getEvidenceDocuments(CourtCase courtCase) {
        return caseDocumentRepository.findByCourtCaseIdOrderByUploadedAtDesc(courtCase.getId()).stream()
                .filter(document -> document.getCategory() != DocumentCategory.ORDER)
                .toList();
    }

    private List<CaseDocument> getOrderDocuments(CourtCase courtCase) {
        return caseDocumentRepository.findByCourtCaseIdAndCategoryOrderByUploadedAtDesc(
                courtCase.getId(),
                DocumentCategory.ORDER);
    }

    private List<HearingRecord> getHearingHistory(CourtCase courtCase) {
        return hearingRecordRepository.findByCourtCaseIdOrderByHearingDateDescCreatedAtDesc(courtCase.getId());
    }

    private String buildPublicCaseSummary(CourtCase courtCase) {
        String court = hasText(courtCase.getCourtName()) ? courtCase.getCourtName() : "Court not specified";
        return court + " · Last updated " + courtCase.getUpdatedAt();
    }

    private void notifyCaseParticipants(
            CourtCase courtCase,
            String actorUsername,
            String eventType,
            String title,
            String message) {
        notificationService.notifyUsers(getCaseRelatedRecipients(courtCase), actorUsername, eventType, title, message,
                courtCase.getCaseNumber());
    }

    private Set<String> getCaseRelatedRecipients(CourtCase courtCase) {
        Set<String> recipients = new LinkedHashSet<>();
        addIfPresent(recipients, courtCase.getClientUsername());
        addIfPresent(recipients, courtCase.getLawyerUsername());
        addIfPresent(recipients, courtCase.getJudgeUsername());
        userRepository.findAll().stream()
                .filter(User::isActive)
                .filter(user -> "ADMIN".equalsIgnoreCase(user.getRole()))
                .map(User::getUsername)
                .forEach(recipients::add);
        return recipients;
    }

    private String buildCaseCreatedMessage(CourtCase courtCase, String actorRole, String actorUsername) {
        return switch (actorRole) {
            case "LAWYER" -> "Lawyer " + actorUsername + " filed case " + courtCase.getCaseNumber()
                    + " for client " + courtCase.getClientUsername() + ".";
            case "ADMIN" -> "Admin " + actorUsername + " filed case " + courtCase.getCaseNumber()
                    + " for client " + courtCase.getClientUsername() + ".";
            default -> "Client " + actorUsername + " filed case " + courtCase.getCaseNumber() + ".";
        };
    }

    private void addIfPresent(Set<String> recipients, String username) {
        if (hasText(username)) {
            recipients.add(username);
        }
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
