package com.ecourt.dto;

public class UserProfileUpdateRequest {
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

    // Getters and Setters
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
}
