package com.ecourt.dto;

import java.time.Instant;

public record NotificationResponse(
        Long id,
        String eventType,
        String title,
        String message,
        String caseNumber,
        boolean read,
        Instant createdAt,
        Instant readAt) {
}
