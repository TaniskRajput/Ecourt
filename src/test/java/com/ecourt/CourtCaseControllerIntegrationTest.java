package com.ecourt;

import com.ecourt.model.User;
import com.ecourt.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CourtCaseControllerIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private UserRepository userRepository;

  @Autowired
  private com.ecourt.repository.CourtCaseRepository courtCaseRepository;

  @Autowired
  private com.ecourt.repository.CaseAuditEventRepository caseAuditEventRepository;

  @Autowired
  private com.ecourt.repository.CaseDocumentRepository caseDocumentRepository;

  @Autowired
  private com.ecourt.repository.HearingRecordRepository hearingRecordRepository;

  @Autowired
  private PasswordEncoder passwordEncoder;

  @Autowired
  private com.ecourt.repository.AuthOtpRepository authOtpRepository;

  @BeforeEach
  void setUp() {
    caseAuditEventRepository.deleteAll();
    caseDocumentRepository.deleteAll();
    hearingRecordRepository.deleteAll();
    courtCaseRepository.deleteAll();
    userRepository.deleteAll();
    saveUser("client1", "client1@example.com", "CLIENT");
    saveUser("admin1", "admin1@example.com", "ADMIN");
    saveUser("judge1", "judge1@example.com", "JUDGE");
  }

  @Test
  void clientCanCreateCaseForSelf() throws Exception {
    mockMvc.perform(post("/cases")
        .with(user("client1").roles("CLIENT"))
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
            {
              "title": "Property Dispute",
              "description": "Boundary issue between neighboring properties."
            }
            """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.caseNumber").value(org.hamcrest.Matchers.startsWith("ECOURT-")))
        .andExpect(jsonPath("$.clientUsername").value("client1"))
        .andExpect(jsonPath("$.status").value("FILED"))
        .andExpect(jsonPath("$.documents").isArray());
  }

  @Test
  void adminCanCreateCaseForClient() throws Exception {
    mockMvc.perform(post("/cases")
        .with(user("admin1").roles("ADMIN"))
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
            {
              "clientUsername": "client1",
              "title": "Contract Dispute",
              "description": "Breach of service agreement."
            }
            """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.clientUsername").value("client1"))
        .andExpect(jsonPath("$.title").value("Contract Dispute"));
  }

  @Test
  void clientCanUploadAndDownloadDocumentForOwnCase() throws Exception {
    String response = mockMvc.perform(post("/cases")
        .with(user("client1").roles("CLIENT"))
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
            {
              "title": "Insurance Claim",
              "description": "Claim dispute documentation."
            }
            """))
        .andExpect(status().isOk())
        .andReturn()
        .getResponse()
        .getContentAsString();

    String caseNumber = com.jayway.jsonpath.JsonPath.read(response, "$.caseNumber");

    MockMultipartFile file = new MockMultipartFile(
        "file",
        "evidence.txt",
        MediaType.TEXT_PLAIN_VALUE,
        "sample evidence".getBytes());

    String uploadResponse = mockMvc.perform(multipart("/cases/{caseNumber}/documents", caseNumber)
        .file(file)
        .with(request -> {
          request.setMethod("POST");
          return request;
        })
        .with(user("client1").roles("CLIENT")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.originalFilename").value("evidence.txt"))
        .andReturn()
        .getResponse()
        .getContentAsString();

    Integer documentId = com.jayway.jsonpath.JsonPath.read(uploadResponse, "$.id");

    mockMvc.perform(get("/cases/{caseNumber}/documents", caseNumber)
        .with(user("client1").roles("CLIENT")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(documentId));

    mockMvc.perform(get("/cases/{caseNumber}/documents/{documentId}/download", caseNumber, documentId)
        .with(user("client1").roles("CLIENT")))
        .andExpect(status().isOk())
        .andExpect(header().string("Content-Disposition",
            "attachment; filename=\"evidence.txt\""))
        .andExpect(content().bytes("sample evidence".getBytes()));
  }

  @Test
  void adminCanCreateFilterUpdateAndDisableUsers() throws Exception {
    String createResponse = mockMvc.perform(post("/admin/users")
        .with(user("admin1").roles("ADMIN"))
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
            {
              "username": "judge2",
              "email": "judge2@example.com",
              "password": "JudgePass234",
              "role": "judge"
            }
            """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.username").value("judge2"))
        .andExpect(jsonPath("$.role").value("JUDGE"))
        .andExpect(jsonPath("$.active").value(true))
        .andReturn()
        .getResponse()
        .getContentAsString();

    Integer createdUserId = com.jayway.jsonpath.JsonPath.read(createResponse, "$.id");

    mockMvc.perform(get("/admin/users")
        .with(user("admin1").roles("ADMIN"))
        .param("role", "JUDGE")
        .param("active", "true")
        .param("query", "judge2")
        .param("page", "0")
        .param("size", "5"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].id").value(createdUserId))
        .andExpect(jsonPath("$.content[0].username").value("judge2"))
        .andExpect(jsonPath("$.totalElements").value(1));

    mockMvc.perform(put("/admin/users/{userId}/role", createdUserId)
        .with(user("admin1").roles("ADMIN"))
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
            {
              "role": "LAWYER"
            }
            """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.role").value("LAWYER"));

    mockMvc.perform(put("/admin/users/{userId}/status", createdUserId)
        .with(user("admin1").roles("ADMIN"))
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
            {
              "active": false
            }
            """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.active").value(false));
  }

  @Test
  void disabledUserCannotLogIn() throws Exception {
    User disabledUser = userRepository.findByUsername("client1").orElseThrow();
    disabledUser.setActive(false);
    userRepository.save(disabledUser);

    mockMvc.perform(post("/auth/login")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
            {
              "username": "client1",
              "password": "Password123"
            }
            """))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void legacyUserWithPlainCharacterOnlyPasswordCanLogIn() throws Exception {
    User legacyUser = new User();
    legacyUser.setUsername("legacyuser");
    legacyUser.setEmail("legacyuser@example.com");
    legacyUser.setPassword("legacyonly");
    legacyUser.setEmailVerified(true);
    legacyUser.setRole("CLIENT");
    legacyUser.setActive(true);
    legacyUser.setAuthProvider("LOCAL");
    userRepository.save(legacyUser);

    mockMvc.perform(post("/auth/login")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
            {
              "username": "legacyuser",
              "password": "legacyonly"
            }
            """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.username").value("legacyuser"))
        .andExpect(jsonPath("$.role").value("CLIENT"));
  }

  @Test
  void judgeCanManageHearingsAndOrdersAndPublicCanTrackCase() throws Exception {
    String caseResponse = mockMvc.perform(post("/cases")
        .with(user("admin1").roles("ADMIN"))
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
            {
              "clientUsername": "client1",
              "courtName": "District Court Patna",
              "title": "Service Matter",
              "description": "Proceedings for hearing and order workflow."
            }
            """))
        .andExpect(status().isOk())
        .andReturn()
        .getResponse()
        .getContentAsString();

    String caseNumber = com.jayway.jsonpath.JsonPath.read(caseResponse, "$.caseNumber");

    mockMvc.perform(put("/cases/{caseNumber}/assign", caseNumber)
        .with(user("admin1").roles("ADMIN"))
        .param("judgeUsername", "judge1"))
        .andExpect(status().isOk());

    mockMvc.perform(post("/cases/{caseNumber}/hearings", caseNumber)
        .with(user("judge1").roles("JUDGE"))
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
            {
              "hearingDate": "2026-04-06",
              "nextHearingDate": "2026-05-07",
              "judgeName": "judge1",
              "remarks": "Arguments heard and next date fixed."
            }
            """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.judgeName").value("judge1"))
        .andExpect(jsonPath("$.remarks").value("Arguments heard and next date fixed."));

    MockMultipartFile orderFile = new MockMultipartFile(
        "file",
        "interim-order.pdf",
        MediaType.APPLICATION_PDF_VALUE,
        "dummy-pdf".getBytes());

    String orderResponse = mockMvc.perform(multipart("/cases/{caseNumber}/orders", caseNumber)
        .file(orderFile)
        .param("title", "Interim Order")
        .param("orderType", "Interim Order")
        .param("orderDate", "2026-04-06")
        .with(request -> {
          request.setMethod("POST");
          return request;
        })
        .with(user("judge1").roles("JUDGE")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.category").value("ORDER"))
        .andExpect(jsonPath("$.documentTitle").value("Interim Order"))
        .andReturn()
        .getResponse()
        .getContentAsString();

    Integer orderId = com.jayway.jsonpath.JsonPath.read(orderResponse, "$.id");

    mockMvc.perform(get("/public/cases/track")
        .param("caseNumber", caseNumber))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].caseNumber").value(caseNumber))
        .andExpect(jsonPath("$[0].courtName").value("District Court Patna"));

    mockMvc.perform(get("/public/cases/{caseNumber}", caseNumber))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.hearings[0].remarks").value("Arguments heard and next date fixed."))
        .andExpect(jsonPath("$.orders[0].documentTitle").value("Interim Order"));

    mockMvc.perform(get("/public/cases/{caseNumber}/orders/{documentId}/download", caseNumber, orderId))
        .andExpect(status().isOk())
        .andExpect(header().string("Content-Disposition",
            "attachment; filename=\"interim-order.pdf\""))
        .andExpect(content().bytes("dummy-pdf".getBytes()));
  }

  @Test
  void userCanRegisterOnlyAfterOtpVerification() throws Exception {
    mockMvc.perform(post("/auth/register/request-otp")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
            {
              "username": "otpclient",
              "email": "otpclient@example.com",
              "role": "CLIENT"
            }
            """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.message").value("OTP sent to your email. Verify it to continue registration."));

    String otpCode = authOtpRepository
        .findTopByEmailAndPurposeOrderByCreatedAtDesc("otpclient@example.com", com.ecourt.model.OtpPurpose.REGISTRATION)
        .orElseThrow()
        .getOtpCode();

    String verifyResponse = mockMvc.perform(post("/auth/register/verify-otp")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
            {
              "email": "otpclient@example.com",
              "otp": "%s"
            }
            """.formatted(otpCode)))
        .andExpect(status().isOk())
        .andReturn()
        .getResponse()
        .getContentAsString();

    String verificationTicket = com.jayway.jsonpath.JsonPath.read(verifyResponse, "$.verificationTicket");

    mockMvc.perform(post("/auth/register/complete")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
            {
              "username": "otpclient",
              "email": "otpclient@example.com",
              "role": "CLIENT",
              "password": "Password123",
              "confirmPassword": "Password123",
              "verificationTicket": "%s"
            }
            """.formatted(verificationTicket)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.message").value("Registration completed successfully."));

    mockMvc.perform(post("/auth/login")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
            {
              "username": "otpclient@example.com",
              "password": "Password123"
            }
            """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.username").value("otpclient"))
        .andExpect(jsonPath("$.role").value("CLIENT"));
  }

  @Test
  void userCanResetPasswordAfterOtpVerification() throws Exception {
    mockMvc.perform(post("/auth/password/request-reset")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
            {
              "email": "client1@example.com"
            }
            """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.message").value("Password reset OTP sent to your email."));

    String otpCode = authOtpRepository
        .findTopByEmailAndPurposeOrderByCreatedAtDesc("client1@example.com", com.ecourt.model.OtpPurpose.PASSWORD_RESET)
        .orElseThrow()
        .getOtpCode();

    String verifyResponse = mockMvc.perform(post("/auth/password/verify-otp")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
            {
              "email": "client1@example.com",
              "otp": "%s"
            }
            """.formatted(otpCode)))
        .andExpect(status().isOk())
        .andReturn()
        .getResponse()
        .getContentAsString();

    String verificationTicket = com.jayway.jsonpath.JsonPath.read(verifyResponse, "$.verificationTicket");

    mockMvc.perform(post("/auth/password/reset")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
            {
              "email": "client1@example.com",
              "password": "UpdatedPass456",
              "confirmPassword": "UpdatedPass456",
              "verificationTicket": "%s"
            }
            """.formatted(verificationTicket)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.message").value("Password reset successful."));

    mockMvc.perform(post("/auth/login")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
            {
              "username": "client1@example.com",
              "password": "UpdatedPass456"
            }
            """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.username").value("client1"));
  }

  @Test
  void adminCanAssignJudgeAndJudgeCanManageAssignedCase() throws Exception {
    String createResponse = mockMvc.perform(post("/cases")
        .with(user("admin1").roles("ADMIN"))
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
            {
              "clientUsername": "client1",
              "title": "Civil Appeal",
              "description": "Appeal related to a land ownership judgment."
            }
            """))
        .andExpect(status().isOk())
        .andReturn()
        .getResponse()
        .getContentAsString();

    String caseNumber = com.jayway.jsonpath.JsonPath.read(createResponse, "$.caseNumber");

    mockMvc.perform(put("/cases/{caseNumber}/assign", caseNumber)
        .with(user("admin1").roles("ADMIN"))
        .param("judgeUsername", "judge1"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.message").value("Judge assigned successfully"));

    mockMvc.perform(get("/cases/my")
        .with(user("judge1").roles("JUDGE")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].caseNumber").value(caseNumber))
        .andExpect(jsonPath("$[0].judgeUsername").value("judge1"))
        .andExpect(jsonPath("$[0].status").value("SCRUTINY"));

    mockMvc.perform(put("/cases/{caseNumber}/status", caseNumber)
        .with(user("judge1").roles("JUDGE"))
        .param("status", "CLOSED"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.message").value("Case status updated to CLOSED"));

    mockMvc.perform(get("/cases/{caseNumber}", caseNumber)
        .with(user("admin1").roles("ADMIN")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("CLOSED"))
        .andExpect(jsonPath("$.judgeUsername").value("judge1"));
  }

  @Test
  void judgeCannotSkipStatusViolatingWorkflowRules() throws Exception {
    String createResponse = mockMvc.perform(post("/cases")
        .with(user("admin1").roles("ADMIN"))
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
            {
              "clientUsername": "client1",
              "title": "State Machine Test",
              "description": "Verifying strict transitions."
            }
            """))
        .andExpect(status().isOk())
        .andReturn()
        .getResponse()
        .getContentAsString();

    String caseNumber = com.jayway.jsonpath.JsonPath.read(createResponse, "$.caseNumber");

    mockMvc.perform(put("/cases/{caseNumber}/assign", caseNumber)
        .with(user("admin1").roles("ADMIN"))
        .param("judgeUsername", "judge1"))
        .andExpect(status().isOk());
    // Status is now SCRUTINY

    // Try invalid transition: SCRUTINY -> ARGUMENT (skipping HEARING)
    mockMvc.perform(put("/cases/{caseNumber}/status", caseNumber)
        .with(user("judge1").roles("JUDGE"))
        .param("status", "ARGUMENT"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message")
            .value("Invalid status transition from SCRUTINY to ARGUMENT."));

    // Try valid transition: SCRUTINY -> HEARING
    mockMvc.perform(put("/cases/{caseNumber}/status", caseNumber)
        .with(user("judge1").roles("JUDGE"))
        .param("status", "HEARING"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.message").value("Case status updated to HEARING"));
  }

  @Test
  void adminCanSearchCasesWithFiltersAndPagination() throws Exception {
    mockMvc.perform(post("/cases")
        .with(user("admin1").roles("ADMIN"))
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
            {
              "clientUsername": "client1",
              "title": "Alpha Contract Matter",
              "description": "Alpha description"
            }
            """))
        .andExpect(status().isOk());

    String secondCaseResponse = mockMvc.perform(post("/cases")
        .with(user("admin1").roles("ADMIN"))
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
            {
              "clientUsername": "client1",
              "title": "Beta Property Matter",
              "description": "Beta description"
            }
            """))
        .andExpect(status().isOk())
        .andReturn()
        .getResponse()
        .getContentAsString();

    String secondCaseNumber = com.jayway.jsonpath.JsonPath.read(secondCaseResponse, "$.caseNumber");

    mockMvc.perform(put("/cases/{caseNumber}/assign", secondCaseNumber)
        .with(user("admin1").roles("ADMIN"))
        .param("judgeUsername", "judge1"))
        .andExpect(status().isOk());

    mockMvc.perform(get("/cases/search")
        .with(user("admin1").roles("ADMIN"))
        .param("scope", "all")
        .param("clientUsername", "client1")
        .param("status", "SCRUTINY")
        .param("judgeUsername", "judge1")
        .param("query", "Beta")
        .param("sortBy", "caseNumber")
        .param("direction", "asc")
        .param("page", "0")
        .param("size", "1"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].caseNumber").value(secondCaseNumber))
        .andExpect(jsonPath("$.content[0].title").value("Beta Property Matter"))
        .andExpect(jsonPath("$.page").value(0))
        .andExpect(jsonPath("$.size").value(1))
        .andExpect(jsonPath("$.totalElements").value(1))
        .andExpect(jsonPath("$.totalPages").value(1));
  }

  @Test
  void clientSearchIsScopedToOwnCasesAndCannotUseAllScope() throws Exception {
    mockMvc.perform(post("/cases")
        .with(user("client1").roles("CLIENT"))
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
            {
              "title": "Client Searchable Matter",
              "description": "Client-owned case for search"
            }
            """))
        .andExpect(status().isOk());

    mockMvc.perform(get("/cases/search")
        .with(user("client1").roles("CLIENT"))
        .param("scope", "my")
        .param("query", "Searchable")
        .param("page", "0")
        .param("size", "10"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].clientUsername").value("client1"))
        .andExpect(jsonPath("$.content[0].title").value("Client Searchable Matter"));

    mockMvc.perform(get("/cases/search")
        .with(user("client1").roles("CLIENT"))
        .param("scope", "all"))
        .andExpect(status().isForbidden());
  }

  @Test
  void auditTrailTracksCaseCreationStatusChangesAndDocumentUploads() throws Exception {
    String createResponse = mockMvc.perform(post("/cases")
        .with(user("admin1").roles("ADMIN"))
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
            {
              "clientUsername": "client1",
              "title": "Audited Matter",
              "description": "Case used to verify audit trail"
            }
            """))
        .andExpect(status().isOk())
        .andReturn()
        .getResponse()
        .getContentAsString();

    String caseNumber = com.jayway.jsonpath.JsonPath.read(createResponse, "$.caseNumber");

    mockMvc.perform(put("/cases/{caseNumber}/assign", caseNumber)
        .with(user("admin1").roles("ADMIN"))
        .param("judgeUsername", "judge1"))
        .andExpect(status().isOk());

    mockMvc.perform(put("/cases/{caseNumber}/status", caseNumber)
        .with(user("judge1").roles("JUDGE"))
        .param("status", "CLOSED"))
        .andExpect(status().isOk());

    MockMultipartFile file = new MockMultipartFile(
        "file",
        "audit-evidence.txt",
        MediaType.TEXT_PLAIN_VALUE,
        "audit trail evidence".getBytes());

    mockMvc.perform(multipart("/cases/{caseNumber}/documents", caseNumber)
        .file(file)
        .with(request -> {
          request.setMethod("POST");
          return request;
        })
        .with(user("client1").roles("CLIENT")))
        .andExpect(status().isOk());

    mockMvc.perform(get("/cases/{caseNumber}/audit", caseNumber)
        .with(user("admin1").roles("ADMIN")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].eventType").value("DOCUMENT_UPLOADED"))
        .andExpect(jsonPath("$[0].actorUsername").value("client1"))
        .andExpect(jsonPath("$[1].eventType").value("CASE_CLOSED"))
        .andExpect(jsonPath("$[1].actorUsername").value("judge1"))
        .andExpect(jsonPath("$[1].details").value("Status changed from SCRUTINY to CLOSED."))
        .andExpect(jsonPath("$[2].eventType").value("JUDGE_ASSIGNED"))
        .andExpect(jsonPath("$[2].actorUsername").value("admin1"))
        .andExpect(jsonPath("$[3].eventType").value("CASE_CREATED"))
        .andExpect(jsonPath("$[3].actorUsername").value("admin1"));
  }

  @Test
  void dashboardSummaryReflectsRoleScopedStatsAndRecentActions() throws Exception {
    String createResponse = mockMvc.perform(post("/cases")
        .with(user("admin1").roles("ADMIN"))
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
            {
              "clientUsername": "client1",
              "title": "Dashboard Matter",
              "description": "Case used to verify dashboard summary"
            }
            """))
        .andExpect(status().isOk())
        .andReturn()
        .getResponse()
        .getContentAsString();

    String caseNumber = com.jayway.jsonpath.JsonPath.read(createResponse, "$.caseNumber");

    mockMvc.perform(put("/cases/{caseNumber}/assign", caseNumber)
        .with(user("admin1").roles("ADMIN"))
        .param("judgeUsername", "judge1"))
        .andExpect(status().isOk());

    mockMvc.perform(get("/cases/dashboard")
        .with(user("admin1").roles("ADMIN")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.role").value("ADMIN"))
        .andExpect(jsonPath("$.totalCases").value(1))
        .andExpect(jsonPath("$.activeCases").value(1))
        .andExpect(jsonPath("$.closedCases").value(0))
        .andExpect(jsonPath("$.unassignedCases").value(0))
        .andExpect(jsonPath("$.totalUsers").value(3))
        .andExpect(jsonPath("$.activeJudges").value(1))
        .andExpect(jsonPath("$.recentCases[0].caseNumber").value(caseNumber))
        .andExpect(jsonPath("$.recentActions[0].eventType").value("JUDGE_ASSIGNED"));
  }

  private void saveUser(String username, String email, String role) {
    User user = new User();
    user.setUsername(username);
    user.setEmail(email);
    user.setPassword(passwordEncoder.encode("Password123"));
    user.setEmailVerified(true);
    user.setRole(role);
    user.setActive(true);
    user.setAuthProvider("LOCAL");
    userRepository.save(user);
  }
}
