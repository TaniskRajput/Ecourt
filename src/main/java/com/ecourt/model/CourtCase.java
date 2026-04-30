package com.ecourt.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Database Entity representing a Legal Court Case.
 * 
 * WHY IT IS USED:
 * This file maps directly to the `cases` table in the database. It is the
 * absolute core
 * data structure of the application. Everything in the E-Court system revolves
 * around
 * this entity. It strictly tracks the workflow state of a legal dispute and
 * binds
 * different user roles (Client, Lawyer, Judge) together into a single
 * contextual record.
 *
 * KEY RESPONSIBILITIES (FUNCTIONS):
 * - caseNumber: A guaranteed unique, human-readable UUID tracking number
 * generated upon creation.
 * - status: Tied strictly to the CaseStatus Enum, preventing the database from
 * ever entering an invalid workflow state.
 * - clientUsername / lawyerUsername / judgeUsername: Links the case securely to
 * the involved parties.
 * - auditEvents / documents: Maintains one-to-many JPA relationships, letting
 * Hibernate automatically fetch a case's full history and file attachments.
 */
@Entity
@Table(name = "cases")
public class CourtCase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String caseNumber;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String courtName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CaseStatus status;

    @Column(nullable = false)
    private LocalDate filedDate;

    @Column(nullable = false)
    private String clientUsername;

    private String lawyerUsername;

    private String judgeUsername;

    private String stateCode;
    private String districtCode;
    private String establishmentCode;
    private String caseTypeCode;
    private String filingNumber;
    private String caseYear;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "courtCase", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CaseDocument> documents = new ArrayList<>();

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        if (status == null) {
            status = CaseStatus.FILED;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    // getters setters

    public Long getId() {
        return id;
    }

    public String getCaseNumber() {
        return caseNumber;
    }

    public void setCaseNumber(String caseNumber) {
        this.caseNumber = caseNumber;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCourtName() {
        return courtName;
    }

    public void setCourtName(String courtName) {
        this.courtName = courtName;
    }

    public CaseStatus getStatus() {
        return status;
    }

    public void setStatus(CaseStatus status) {
        this.status = status;
    }

    public LocalDate getFiledDate() {
        return filedDate;
    }

    public void setFiledDate(LocalDate filedDate) {
        this.filedDate = filedDate;
    }

    public String getClientUsername() {
        return clientUsername;
    }

    public void setClientUsername(String clientUsername) {
        this.clientUsername = clientUsername;
    }

    public String getLawyerUsername() {
        return lawyerUsername;
    }

    public void setLawyerUsername(String lawyerUsername) {
        this.lawyerUsername = lawyerUsername;
    }

    public String getJudgeUsername() {
        return judgeUsername;
    }

    public void setJudgeUsername(String judgeUsername) {
        this.judgeUsername = judgeUsername;
    }

    public String getStateCode() {
        return stateCode;
    }

    public void setStateCode(String stateCode) {
        this.stateCode = stateCode;
    }

    public String getDistrictCode() {
        return districtCode;
    }

    public void setDistrictCode(String districtCode) {
        this.districtCode = districtCode;
    }

    public String getEstablishmentCode() {
        return establishmentCode;
    }

    public void setEstablishmentCode(String establishmentCode) {
        this.establishmentCode = establishmentCode;
    }

    public String getCaseTypeCode() {
        return caseTypeCode;
    }

    public void setCaseTypeCode(String caseTypeCode) {
        this.caseTypeCode = caseTypeCode;
    }

    public String getFilingNumber() {
        return filingNumber;
    }

    public void setFilingNumber(String filingNumber) {
        this.filingNumber = filingNumber;
    }

    public String getCaseYear() {
        return caseYear;
    }

    public void setCaseYear(String caseYear) {
        this.caseYear = caseYear;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public List<CaseDocument> getDocuments() {
        return documents;
    }

    public void addDocument(CaseDocument document) {
        documents.add(document);
        document.setCourtCase(this);
    }
}
