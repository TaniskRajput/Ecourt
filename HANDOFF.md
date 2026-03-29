# Ecourt Handoff

## Project Direction

This project is being treated as a production-grade case management backend.

Current priorities from the user:
- Primary product roles: `CLIENT` and `ADMIN`
- Backend-first implementation
- React frontend will come later
- Document upload is in scope now

## What Was Completed

The first two backend productionization slices were implemented.

### Case API changes
- Replaced raw entity-based case creation with DTO-based input/output
- Added server-generated case numbers
- Added client-first case filing flow
- Added admin ability to file a case on behalf of a client
- Added `/cases/my` for current user case listing
- Kept `/cases/all` for admin/judge visibility
- Expanded role-based case handling for `ADMIN` and `JUDGE`
  - admins can assign judges to cases
  - judges can self-assign to eligible cases
  - judges can list their assigned cases through `/cases/my`
  - admins can update case status
  - assigned judges can update case status
- Added paginated `/cases/search` with scope filters (client, status, judge, lawyer, date, query) plus page/size controls and role-aware enforcement

### Document upload
- Added persistent case document entity and repository
- Added local document storage service
- Added endpoints to:
  - upload a case document
  - list case documents
  - download a case document
- Added audit trail per case for creation/status/document events, stored actor/timestamp/details, and exposed `/cases/{caseNumber}/audit`

### Validation and API consistency
- Added request validation for auth and case creation inputs
- Added standard message response wrapper
- Added global exception handler with structured API error responses

### Admin user management
- Added paginated admin user listing with optional filters for:
  - role
  - active status
  - username/email search query
- Added admin endpoint to create users with controlled roles
- Added admin endpoint to change a user's role
- Added admin endpoint to activate/deactivate a user
- Added safeguards preventing admins from removing their own admin role or deactivating themselves
- Added persisted user `active` flag and enforced it in authentication

### Production-hardening changes
- Disabled `spring.jpa.open-in-view`
- Added multipart config properties
- Added upload directory config

## Main Files Changed

Updated:
- `HANDOFF.md`
- `pom.xml`
- `src/main/java/com/ecourt/config/SecurityConfig.java`
- `src/main/java/com/ecourt/controller/AuthController.java`
- `src/main/java/com/ecourt/controller/AdminController.java`
- `src/main/java/com/ecourt/controller/CourtCaseController.java`
- `src/main/java/com/ecourt/dto/LoginRequest.java`
- `src/main/java/com/ecourt/dto/RegisterRequest.java`
- `src/main/java/com/ecourt/dto/UserSummaryResponse.java`
- `src/main/java/com/ecourt/model/CourtCase.java`
- `src/main/java/com/ecourt/model/User.java`
- `src/main/java/com/ecourt/repository/CourtCaseRepository.java`
- `src/main/java/com/ecourt/repository/UserRepository.java`
- `src/main/java/com/ecourt/security/CustomUserDetails.java`
- `src/main/java/com/ecourt/service/CourtCaseService.java`
- `src/main/java/com/ecourt/service/AdminService.java`
- `src/main/java/com/ecourt/service/UserService.java`
- `src/main/resources/application.properties`
- `src/main/resources/application-h2.properties`
- `src/test/resources/application.properties`

Added:
- `src/main/java/com/ecourt/dto/AdminCreateUserRequest.java`
- `src/main/java/com/ecourt/controller/GlobalExceptionHandler.java`
- `src/main/java/com/ecourt/dto/ApiErrorResponse.java`
- `src/main/java/com/ecourt/dto/CaseCreateRequest.java`
- `src/main/java/com/ecourt/dto/CaseDocumentResponse.java`
- `src/main/java/com/ecourt/dto/CaseResponse.java`
- `src/main/java/com/ecourt/dto/MessageResponse.java`
- `src/main/java/com/ecourt/dto/UpdateUserRoleRequest.java`
- `src/main/java/com/ecourt/dto/UpdateUserStatusRequest.java`
- `src/main/java/com/ecourt/dto/UserListResponse.java`
- `src/main/java/com/ecourt/model/CaseDocument.java`
- `src/main/java/com/ecourt/repository/CaseDocumentRepository.java`
- `src/main/java/com/ecourt/service/DocumentStorageService.java`
- `src/test/java/com/ecourt/CourtCaseControllerIntegrationTest.java`

## Verification

Verified with:

```bash
./mvnw test
```

Result:
- tests passing

## Known Current State

- File storage is local filesystem storage, configured by `app.storage.upload-dir`
- This is acceptable for now, but should later move behind a replaceable storage backend for cloud/object storage
- Users now have an `active` flag; disabled users cannot authenticate
- Admin user APIs exist for create/list/filter/role change/activate-deactivate
- Case role logic now supports:
  - admin filing for clients
  - admin judge assignment
  - judge self-assignment
  - judge assigned-case listing via `/cases/my`
  - admin and assigned-judge status changes
- Security config still carries a Spring Security warning about the authentication provider setup, but the application and tests are working
- Hibernate warns that the explicit H2 dialect property is unnecessary; not currently blocking

## Recommended Next Slice

Build the next backend phase in this order:

1. Storage abstraction cleanup
- prepare document storage for future S3/object storage support

## Resume Prompt

If resuming in a new Codex session, use:

“Read `HANDOFF.md` in the Ecourt repo and continue with the next backend slice.”
