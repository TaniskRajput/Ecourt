# Ecourt Handoff

## Project Direction

This project is now moving from backend productionization into a real multi-role court portal.

Current priorities from the user:
- Build expected portal experiences for `CLIENT`, `JUDGE`, and `ADMIN`
- Keep backend correctness and role enforcement strong while expanding the React UI
- Support richer dashboards, structured case details, better audit visibility, and operational workflows
- Continue treating document upload and auditability as core platform features

## What Was Completed

The backend productionization work is still in place, and the next portal slice has now been implemented.

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
- Extended `/cases/search` with sorting support (`sortBy`, `direction`) for real case-table usage
- Added `GET /cases/dashboard` returning a role-aware dashboard summary with counts, recent cases, and recent actions
- Enriched `CaseResponse` with:
  - allowed next statuses
  - `canAssignJudge`
  - `canUpdateStatus`
  - `canUploadDocuments`

### Document upload
- Added persistent case document entity and repository
- Added local document storage service
- Added endpoints to:
  - upload a case document
  - list case documents
  - download a case document
- Added audit trail per case for creation/status/document events, stored actor/timestamp/details, and exposed `/cases/{caseNumber}/audit`
- Improved audit semantics so assignment and closure show up as dedicated events (`JUDGE_ASSIGNED`, `CASE_CLOSED`)

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

### React portal slice
- Reworked the React dashboard into role-aware client, judge, and admin summaries
- Added recent case and recent action panels backed by the new dashboard summary endpoint
- Reworked the case details page into structured sections:
  - case metadata
  - workflow timeline
  - document management
  - audit trail
  - role-based actions
- Upgraded the search page to support realistic search/filter/sort combinations for case tables
- Turned the manage page into an actual operations workbench:
  - admin user role management
  - admin activate/deactivate flow
  - judge assignment flow
  - quick status update actions
  - quick lookup with direct case access

### Phase 2 polish
- Added workbench refresh behavior after admin/judge actions so counters, judge lists, permissions, and case rows stay in sync
- Added per-row action loading states for assignments, status updates, and user management actions
- Added manual refresh control for the management dashboard

### Production-hardening changes
- Disabled `spring.jpa.open-in-view`
- Added multipart config properties
- Added upload directory config

## Main Files Changed

Updated:
- `HANDOFF.md`
- `src/main/java/com/ecourt/controller/CourtCaseController.java`
- `src/main/java/com/ecourt/service/CourtCaseService.java`
- `src/test/java/com/ecourt/CourtCaseControllerIntegrationTest.java`
- `frontend-react/src/services/api.js`
- `frontend-react/src/pages/dashboard/Overview.jsx`
- `frontend-react/src/pages/dashboard/SearchCases.jsx`
- `frontend-react/src/pages/dashboard/CaseDetail.jsx`
- `frontend-react/src/pages/dashboard/ManageCases.jsx`

Added:
- `src/main/java/com/ecourt/dto/DashboardSummaryResponse.java`

## Verification

Verified with:

```bash
./mvnw test
npm run build --prefix frontend-react
```

Result:
- Spring tests passing
- React production build passing

## Known Current State

- File storage is local filesystem storage, configured by `app.storage.upload-dir`
- This is acceptable for now, but should later move behind a replaceable storage backend for cloud/object storage
- Users now have an `active` flag; disabled users cannot authenticate
- Admin user APIs exist for create/list/filter/role change/activate-deactivate
- Dashboard and manage views are now usable, but they still rely on client-side polling/manual refresh rather than a stronger query/state library
- The React app now consumes richer backend DTOs for permissions and workflow actions
- Case role logic now supports:
  - admin filing for clients
  - admin judge assignment
  - judge self-assignment
  - judge assigned-case listing via `/cases/my`
  - admin and assigned-judge status changes
  - dashboard summary counts and recent activity
  - structured action permissions in case details
- Security config still carries a Spring Security warning about the authentication provider setup, but the application and tests are working
- Hibernate warns that the explicit H2 dialect property is unnecessary; not currently blocking

## Recommended Next Slice

Build the next stabilization slice in this order:

1. Frontend verification coverage
- add targeted frontend tests for dashboard, search, and management flows

2. Storage abstraction cleanup
- prepare document storage for future S3/object storage support

3. UI state management hardening
- replace manual refresh-heavy flows with more structured client-side data synchronization

## Resume Prompt

If resuming in a new Codex session, use:

“Read `HANDOFF.md` in the Ecourt repo and continue with the next portal stabilization slice.”
