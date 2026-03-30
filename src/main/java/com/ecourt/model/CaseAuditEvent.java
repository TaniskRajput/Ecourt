package com.ecourt.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * Database Entity representing a Historical Audit Log.
 * 
 * WHY IT IS USED:
 * This file maps to the `case_audit_events` table and creates a permanent,
 * append-only
 * ledger of every action taken against a Court Case. By decoupling audit events
 * into
 * their own table linked to the case, the system can provide a transparent,
 * legally
 * sound history of who changed what and when, which is critical for a judicial
 * platform.
 *
 * KEY RESPONSIBILITIES (FUNCTIONS):
 * - eventType: Categorizes the action (e.g., "STATUS_CHANGE",
 * "DOCUMENT_UPLOADED", "JUDGE_ASSIGNED").
 * - actorUsername: Confirms exactly who performed the action to prevent
 * repudiation.
 * - details: Contains the granular JSON-like string of what explicitly changed.
 * - occurredAt: Irrevocably stamped by the JVM before saving, marked as
 * `updatable = false` to prevent tampering.
 */
@Entity
@Table(name = "case_audit_events")
public class CaseAuditEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "case_id", nullable = false)
    private CourtCase courtCase;

    @Column(nullable = false)
    private String eventType;

    @Column(nullable = false)
    private String actorUsername;

    @Column(nullable = false, length = 1000)
    private String details;

    @Column(nullable = false, updatable = false)
    private Instant occurredAt;

    @PrePersist
    void onCreate() {
        occurredAt = Instant.now();
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

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public String getActorUsername() {
        return actorUsername;
    }

    public void setActorUsername(String actorUsername) {
        this.actorUsername = actorUsername;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }
}
