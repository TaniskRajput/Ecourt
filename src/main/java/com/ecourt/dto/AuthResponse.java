package com.ecourt.dto;

public record AuthResponse(String token, String username, String role) {
}
