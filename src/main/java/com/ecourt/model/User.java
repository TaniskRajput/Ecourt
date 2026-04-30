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

    private String fullName;

    private String mobileNumber;

    private String aadhaarLast4;

    private String state;

    private String district;

    private String preferredCourt;

    @Column(length = 1000)
    private String address;

    private String barCouncilId;

    private String enrollmentNumber;

    private String practiceArea;

    private String idProofType;

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

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getMobileNumber() {
        return mobileNumber;
    }

    public void setMobileNumber(String mobileNumber) {
        this.mobileNumber = mobileNumber;
    }

    public String getAadhaarLast4() {
        return aadhaarLast4;
    }

    public void setAadhaarLast4(String aadhaarLast4) {
        this.aadhaarLast4 = aadhaarLast4;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public String getDistrict() {
        return district;
    }

    public void setDistrict(String district) {
        this.district = district;
    }

    public String getPreferredCourt() {
        return preferredCourt;
    }

    public void setPreferredCourt(String preferredCourt) {
        this.preferredCourt = preferredCourt;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getBarCouncilId() {
        return barCouncilId;
    }

    public void setBarCouncilId(String barCouncilId) {
        this.barCouncilId = barCouncilId;
    }

    public String getEnrollmentNumber() {
        return enrollmentNumber;
    }

    public void setEnrollmentNumber(String enrollmentNumber) {
        this.enrollmentNumber = enrollmentNumber;
    }

    public String getPracticeArea() {
        return practiceArea;
    }

    public void setPracticeArea(String practiceArea) {
        this.practiceArea = practiceArea;
    }

    public String getIdProofType() {
        return idProofType;
    }

    public void setIdProofType(String idProofType) {
        this.idProofType = idProofType;
    }
}
