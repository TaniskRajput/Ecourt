package com.ecourt.model;

import jakarta.persistence.*;

@Entity
@Table(name = "cases")
public class CourtCase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String caseNumber;

    private String title;

    private String description;

    private String status; // PENDING / CLOSED

    private String filedDate;

    private String clientUsername;

    private String lawyerUsername;

    private String judgeUsername;

    // getters setters

    public Long getId() {
        return id;
    }

    public String getCaseNumber() {
        return caseNumber;
    }

    public void setCaseNumber(String caseNumber) {
        this.caseNumber = caseNumber;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getFiledDate() {
        return filedDate;
    }

    public void setFiledDate(String filedDate) {
        this.filedDate = filedDate;
    }

    public String getClientUsername() {
        return clientUsername;
    }

    public void setClientUsername(String clientUsername) {
        this.clientUsername = clientUsername;
    }

    public String getLawyerUsername() {
        return lawyerUsername;
    }

    public void setLawyerUsername(String lawyerUsername) {
        this.lawyerUsername = lawyerUsername;
    }

    public String getJudgeUsername() {
        return judgeUsername;
    }

    public void setJudgeUsername(String judgeUsername) {
        this.judgeUsername = judgeUsername;
    }
}
