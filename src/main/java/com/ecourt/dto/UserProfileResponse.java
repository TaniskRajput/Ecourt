package com.ecourt.dto;

import java.time.Instant;

public class UserProfileResponse {
    private String username;
    private String email;
    private String role;
    private String fullName;
    private String mobileNumber;
    private String address;
    private String aadhaarLast4;
    private String state;
    private String district;
    private String preferredCourt;
    private String barCouncilId;
    private String enrollmentNumber;
    private String practiceArea;
    private String idProofType;
    private Instant createdAt;

    // Constructors
    public UserProfileResponse() {}
    
    public UserProfileResponse(String username, String email, String role, String fullName, String mobileNumber, String address, String aadhaarLast4,
                              String state, String district, String preferredCourt, String barCouncilId, String enrollmentNumber,
                              String practiceArea, String idProofType, Instant createdAt) {
        this.username = username;
        this.email = email;
        this.role = role;
        this.fullName = fullName;
        this.mobileNumber = mobileNumber;
        this.address = address;
        this.aadhaarLast4 = aadhaarLast4;
        this.state = state;
        this.district = district;
        this.preferredCourt = preferredCourt;
        this.barCouncilId = barCouncilId;
        this.enrollmentNumber = enrollmentNumber;
        this.practiceArea = practiceArea;
        this.idProofType = idProofType;
        this.createdAt = createdAt;
    }

    // Getters and Setters
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getMobileNumber() { return mobileNumber; }
    public void setMobileNumber(String mobileNumber) { this.mobileNumber = mobileNumber; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getAadhaarLast4() { return aadhaarLast4; }
    public void setAadhaarLast4(String aadhaarLast4) { this.aadhaarLast4 = aadhaarLast4; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public String getDistrict() { return district; }
    public void setDistrict(String district) { this.district = district; }
    public String getPreferredCourt() { return preferredCourt; }
    public void setPreferredCourt(String preferredCourt) { this.preferredCourt = preferredCourt; }
    public String getBarCouncilId() { return barCouncilId; }
    public void setBarCouncilId(String barCouncilId) { this.barCouncilId = barCouncilId; }
    public String getEnrollmentNumber() { return enrollmentNumber; }
    public void setEnrollmentNumber(String enrollmentNumber) { this.enrollmentNumber = enrollmentNumber; }
    public String getPracticeArea() { return practiceArea; }
    public void setPracticeArea(String practiceArea) { this.practiceArea = practiceArea; }
    public String getIdProofType() { return idProofType; }
    public void setIdProofType(String idProofType) { this.idProofType = idProofType; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
