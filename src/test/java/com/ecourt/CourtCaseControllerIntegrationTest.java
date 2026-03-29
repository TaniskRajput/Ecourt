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
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
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
                .andExpect(jsonPath("$.status").value("PENDING"))
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
                "sample evidence".getBytes()
        );

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
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"evidence.txt\""))
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
                .andExpect(jsonPath("$[0].status").value("IN_PROGRESS"));

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
                        .param("status", "IN_PROGRESS")
                        .param("judgeUsername", "judge1")
                        .param("query", "Beta")
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
                "audit trail evidence".getBytes()
        );

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
                .andExpect(jsonPath("$[1].eventType").value("CASE_STATUS_UPDATED"))
                .andExpect(jsonPath("$[1].actorUsername").value("judge1"))
                .andExpect(jsonPath("$[1].details").value("Status changed from IN_PROGRESS to CLOSED."))
                .andExpect(jsonPath("$[2].eventType").value("CASE_CREATED"))
                .andExpect(jsonPath("$[2].actorUsername").value("admin1"));
    }

    private void saveUser(String username, String email, String role) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode("Password123"));
        user.setRole(role);
        user.setActive(true);
        userRepository.save(user);
    }
}
