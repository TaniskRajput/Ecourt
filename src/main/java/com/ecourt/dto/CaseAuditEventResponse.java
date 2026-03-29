package com.ecourt.dto;

import java.time.Instant;

public record CaseAuditEventResponse(
        Long id,
        String eventType,
        String actorUsername,
        String details,
        Instant occurredAt
) {
}
