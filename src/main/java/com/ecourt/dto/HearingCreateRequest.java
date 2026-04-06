package com.ecourt.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record HearingCreateRequest(
        @NotNull(message = "Hearing date is required")
        LocalDate hearingDate,
        LocalDate nextHearingDate,
        String judgeName,
        @NotBlank(message = "Remarks are required")
        @Size(max = 2000, message = "Remarks must be at most 2000 characters")
        String remarks
) {
}
