package com.ecourt.dto;

public class UserProfileResponse {
    private String username;
    private String email;
    private String role;
    private String fullName;
    private String mobileNumber;
    private String address;
    private String aadhaarLast4;

    // Constructors
    public UserProfileResponse() {}
    
    public UserProfileResponse(String username, String email, String role, String fullName, String mobileNumber, String address, String aadhaarLast4) {
        this.username = username;
        this.email = email;
        this.role = role;
        this.fullName = fullName;
        this.mobileNumber = mobileNumber;
        this.address = address;
        this.aadhaarLast4 = aadhaarLast4;
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
}

