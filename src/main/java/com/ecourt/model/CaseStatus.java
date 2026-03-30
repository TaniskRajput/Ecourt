package com.ecourt.model;

import java.util.Set;

/**
 * Strict State Machine Enum for Case Workflow.
 * 
 * WHY IT IS USED:
 * This file defines the exact lifecycle pipeline of a court case. By completely
 * eliminating
 * raw strings (like "PENDING" or "DONE") in favor of an Enum, the JVM
 * guarantees type safety.
 * Furthermore, this file embeds the actual workflow transition rules directly
 * into the Enum itself,
 * making it impossible for arbitrary parts of the codebase to incorrectly jump
 * states.
 *
 * FUNCTIONS OVERVIEW:
 * - getAllowedTransitions: Hardcodes the E-Court legal pipeline (e.g., FILED ->
 * SCRUTINY -> HEARING -> ARGUMENT -> JUDGMENT -> CLOSED).
 * - canTransitionTo: Evaluates if an incoming transition request is
 * mathematically valid according to the state machine rules.
 */
public enum CaseStatus {
    FILED,
    SCRUTINY,
    HEARING,
    ARGUMENT,
    JUDGMENT,
    CLOSED;

    /**
     * Defines the strict state machine allowed transitions.
     *
     * @return the set of CaseStatuses this status can transition to.
     */
    public Set<CaseStatus> getAllowedTransitions() {
        return switch (this) {
            case FILED -> Set.of(SCRUTINY, CLOSED);
            case SCRUTINY -> Set.of(HEARING, CLOSED);
            case HEARING -> Set.of(ARGUMENT, CLOSED);
            case ARGUMENT -> Set.of(JUDGMENT, CLOSED);
            case JUDGMENT -> Set.of(CLOSED);
            case CLOSED -> Set.of(); // Terminal state
        };
    }

    /**
     * Evaluates if transitioning from the current status to the requested status is
     * permitted.
     *
     * @param targetStatus the requested next status
     * @return true if permitted, false otherwise
     */
    public boolean canTransitionTo(CaseStatus targetStatus) {
        if (targetStatus == null) {
            return false;
        }
        // Allow updating to the identical state (no-op)
        if (this == targetStatus) {
            return true;
        }
        return getAllowedTransitions().contains(targetStatus);
    }
}
