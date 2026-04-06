package com.ecourt.model;

import jakarta.persistence.*;

import java.time.Instant;

/**
 * Database Entity representing an uploaded Evidentiary Document.
 * 
 * WHY IT IS USED:
 * This file maps to the `case_documents` table and acts as the metadata bridge
 * between
 * the database and the physical file system (managed by StorageService). It
 * prevents the
 * physical storage drive from becoming a messy dump of files by recording
 * exactly who
 * uploaded what, when it was uploaded, and which specific Court Case it belongs
 * to.
 *
 * KEY RESPONSIBILITIES (FUNCTIONS):
 * - originalFilename: Stores the human-readable name of the file uploaded by
 * the user.
 * - storedFilename: A secure, collision-free UUID used to actually locate the
 * file on disk.
 * - uploadedBy: Tracks the strict username of the uploader for security and
 * auditing.
 * - onCreate: A JPA @PrePersist hook that automatically stamps the exact server
 * time the file was saved.
 */
@Entity
@Table(name = "case_documents")
public class CaseDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "case_id", nullable = false)
    private CourtCase courtCase;

    @Column(nullable = false)
    private String originalFilename;

    @Column(nullable = false, unique = true)
    private String storedFilename;

    @Column(nullable = false)
    private String contentType;

    @Column(nullable = false)
    private long sizeBytes;

    @Column(nullable = false)
    private String uploadedBy;

    @Enumerated(EnumType.STRING)
    @Column
    private DocumentCategory category = DocumentCategory.EVIDENCE;

    private String documentTitle;

    private String orderType;

    private Instant orderDate;

    @Column(nullable = false, updatable = false)
    private Instant uploadedAt;

    @PrePersist
    void onCreate() {
        uploadedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public CourtCase getCourtCase() {
        return courtCase;
    }

    public void setCourtCase(CourtCase courtCase) {
        this.courtCase = courtCase;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public void setOriginalFilename(String originalFilename) {
        this.originalFilename = originalFilename;
    }

    public String getStoredFilename() {
        return storedFilename;
    }

    public void setStoredFilename(String storedFilename) {
        this.storedFilename = storedFilename;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public void setSizeBytes(long sizeBytes) {
        this.sizeBytes = sizeBytes;
    }

    public String getUploadedBy() {
        return uploadedBy;
    }

    public void setUploadedBy(String uploadedBy) {
        this.uploadedBy = uploadedBy;
    }

    public DocumentCategory getCategory() {
        return category;
    }

    public void setCategory(DocumentCategory category) {
        this.category = category;
    }

    public String getDocumentTitle() {
        return documentTitle;
    }

    public void setDocumentTitle(String documentTitle) {
        this.documentTitle = documentTitle;
    }

    public String getOrderType() {
        return orderType;
    }

    public void setOrderType(String orderType) {
        this.orderType = orderType;
    }

    public Instant getOrderDate() {
        return orderDate;
    }

    public void setOrderDate(Instant orderDate) {
        this.orderDate = orderDate;
    }

    public Instant getUploadedAt() {
        return uploadedAt;
    }
}
