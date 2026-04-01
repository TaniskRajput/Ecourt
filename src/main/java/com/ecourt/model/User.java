package com.ecourt.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

/**
 * Database Entity representing a System User.
 * 
 * WHY IT IS USED:
 * This file maps directly to the `users` table in the SQL database using JPA
 * (Hibernate).
 * It acts as the central security and identity record for every person who logs
 * into the
 * E-Court platform (Admins, Judges, Lawyers, Clients). By centralizing user
 * data,
 * Spring Security can authenticate users against this table, and other entities
 * (like Cases)
 * can confidently link to validated usernames.
 *
 * KEY RESPONSIBILITIES (FUNCTIONS):
 * - id: Uniquely identifies the user internally.
 * - username / email: Enforced as unique constraints to prevent duplicate
 * signups.
 * - password: Never sent back to the frontend (protected by @JsonIgnore) and
 * always stored as a BCrypt hash.
 * - role: Drives the RBAC (Role-Based Access Control) engine (e.g., "JUDGE").
 * - active: A soft-delete flag allowing Admins to disable logins without
 * destroying historical data.
 */
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    @JsonIgnore
    private String password;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private boolean emailVerified = false;

    @Column(nullable = false)
    private String role;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false)
    private String authProvider = "LOCAL";

    private String googleSubject;

    @org.hibernate.annotations.CreationTimestamp
    @Column(updatable = false)
    private java.time.Instant createdAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public boolean isEmailVerified() {
        return emailVerified;
    }

    public void setEmailVerified(boolean emailVerified) {
        this.emailVerified = emailVerified;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public String getAuthProvider() {
        return authProvider;
    }

    public void setAuthProvider(String authProvider) {
        this.authProvider = authProvider;
    }

    public String getGoogleSubject() {
        return googleSubject;
    }

    public void setGoogleSubject(String googleSubject) {
        this.googleSubject = googleSubject;
    }

    public java.time.Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(java.time.Instant createdAt) {
        this.createdAt = createdAt;
    }
}
