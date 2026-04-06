package com.ecourt.dto;

import java.time.Instant;
import java.time.LocalDate;

public record HearingResponse(
        Long id,
        LocalDate hearingDate,
        LocalDate nextHearingDate,
        String judgeName,
        String remarks,
        String createdBy,
        Instant createdAt
) {
}
