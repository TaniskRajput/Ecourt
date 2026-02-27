package com.ecourt.dto;

public class AuthResponse {

    private String message;
    private String username;
    private String role;

    public AuthResponse(String message, String username, String role) {
        this.message = message;
        this.username = username;
        this.role = role;
    }

    public String getMessage() { return message; }
    public String getUsername() { return username; }
    public String getRole() { return role; }
}