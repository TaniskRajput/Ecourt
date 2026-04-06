# Ecourt Handoff

## Project Snapshot

`Ecourt` is now beyond the initial CRUD stage. The project currently has:

- Spring Boot backend with JWT-based auth and role-aware access control
- React portal for `CLIENT`, `LAWYER`, `JUDGE`, and `ADMIN` workflows
- Case filing, search, assignment, status progression, document handling, and audit history
- Public case tracking with hearing history and court-order download flow
- Dashboard-based hearing recording and court-order upload workflows
- Admin user management and dashboard/reporting endpoints
- OTP-backed registration and password reset flows

The codebase is in a transition point between "feature-complete demo portal" and "stabilized production-ready platform."

## What Is Implemented

### Authentication and user lifecycle

- JWT login flow is implemented through `/auth/login`
- Username or email can be used for login
- User activation and email verification are enforced during authentication
- OTP-based registration flow is implemented:
  - `/auth/register/request-otp`
  - `/auth/register/verify-otp`
  - `/auth/register/complete`
- OTP-based password reset flow is implemented:
  - `/auth/password/request-reset`
  - `/auth/password/verify-otp`
  - `/auth/password/reset`
- Password policy for new passwords is enforced in backend flows:
  - minimum 8 characters
  - must contain letters and numbers
- Legacy login compatibility is now implemented for pre-seeded old users whose stored passwords may still be plain character-only values
  - login accepts BCrypt passwords for current users
  - login also accepts old plain stored passwords for legacy users
  - this compatibility is scoped to login and does not relax the new-password policy for registration or reset
- Google auth endpoint exists only as a placeholder and is not yet functionally integrated

### Roles and access

- Supported roles in the system:
  - `CLIENT`
  - `LAWYER`
  - `JUDGE`
  - `ADMIN`
- Role-based endpoint protection is in place via Spring Security
- Admin safeguards are implemented:
  - admins cannot remove their own admin role
  - admins cannot deactivate themselves

### Case management

- DTO-based case creation and response models are in place
- Server-generated case numbers are implemented
- Optional `courtName` is now supported on cases
- Clients can file cases for themselves
- Admins can file cases on behalf of clients
- `/cases/my` provides role-scoped personal case views
- `/cases/all` remains available for broader admin/judge access
- Admins can assign judges
- Judges can work assigned cases
- Admins and assigned judges can update case status
- Workflow-aware status transitions are validated
- Case detail responses include action metadata such as:
  - allowed next statuses
  - judge assignment permission
  - status update permission
  - document upload permission

### Search, dashboard, and operations

- Paginated case search is implemented through `/cases/search`
- Search supports:
  - scope
  - status
  - client username
  - judge username
  - lawyer username
  - text query
  - date filters
  - sorting
  - pagination
- Role-aware dashboard summary is implemented through `/cases/dashboard`
- Dashboard summary includes:
  - counts
  - recent cases
  - recent actions
- Admin user management APIs are implemented:
  - paginated list/filter users
  - create managed users
  - change user role
  - activate/deactivate user

### Documents and auditability

- Case document upload is implemented
- Case document listing is implemented
- Case document download is implemented
- Case documents now distinguish between evidence uploads and court-order documents
- Court-order uploads support order title, order type, and order date metadata
- Local filesystem-backed storage is used for uploaded files
- Audit trail is implemented for key case actions
- Dedicated audit event types include:
  - case created
  - judge assigned
  - status changes
  - case closed
  - document uploaded
  - hearing added
  - order uploaded
- `/cases/{caseNumber}/audit` exposes case audit history

### Hearings and public tracking

- Hearing records are now persisted separately from the generic audit trail
- `/cases/{caseNumber}/hearings` supports judge/admin hearing management
- `/cases/{caseNumber}/orders` supports judge/admin order upload and listing
- `/public/cases/track` supports public case search by case number, year, and court
- `/public/cases/{caseNumber}` returns public hearing/order history for a case
- Public order downloads are available through `/public/cases/{caseNumber}/orders/{documentId}/download`

### Frontend

- React portal is the main UI direction
- Role-aware dashboard pages are implemented
- Search/filter/sort experience is implemented in the React app
- Structured case detail page is implemented
- Management/workbench page is implemented for admin operations
- Refresh behavior and action loading states were added for admin/judge workflows
- Public `Track Case` page is implemented in the React app
- Public case history page is implemented for hearing history and court orders
- Dashboard `Hearings` and `Orders` sections are now functional

## Important Recent Changes

The most recent feature slice added hearings, typed court orders, and public case tracking. A follow-up stabilization cleanup simplified auth password matching and removed explicit Hibernate dialect warnings.

What changed:
- hearings are now stored as first-class records instead of only appearing in generic audit history
- court orders are uploaded separately from evidence documents and carry order metadata
- public users can search cases and view hearing/order history without logging in
- auth login now delegates all password matching through the shared `PasswordEncoder`
- explicit `hibernate.dialect` configuration was removed from runtime and test properties to reduce warning noise

Primary files involved:
- [src/main/java/com/ecourt/service/CourtCaseService.java](/home/tanisk/Downloads/Ecourt/src/main/java/com/ecourt/service/CourtCaseService.java)
- [src/main/java/com/ecourt/controller/CourtCaseController.java](/home/tanisk/Downloads/Ecourt/src/main/java/com/ecourt/controller/CourtCaseController.java)
- [src/main/java/com/ecourt/controller/PublicCaseTrackingController.java](/home/tanisk/Downloads/Ecourt/src/main/java/com/ecourt/controller/PublicCaseTrackingController.java)
- [frontend-react/src/pages/TrackCasePage.jsx](/home/tanisk/Downloads/Ecourt/frontend-react/src/pages/TrackCasePage.jsx)
- [frontend-react/src/pages/CaseHistoryPage.jsx](/home/tanisk/Downloads/Ecourt/frontend-react/src/pages/CaseHistoryPage.jsx)
- [frontend-react/src/pages/dashboard/HearingsOrdersPage.jsx](/home/tanisk/Downloads/Ecourt/frontend-react/src/pages/dashboard/HearingsOrdersPage.jsx)
- [src/main/java/com/ecourt/service/UserService.java](/home/tanisk/Downloads/Ecourt/src/main/java/com/ecourt/service/UserService.java)

## Current Known State

- The backend is functional and broadly integration-tested
- The React portal is usable for major role-based workflows
- Public case tracking is now available for hearing/order history without authentication
- File storage is still local and should later become replaceable
- Google sign-in is not implemented yet
- The project still has technical debt around frontend data-fetch orchestration and deployment hardening
- Auth wiring is simpler than before, but production deployment still requires a separately hosted backend/API
- The portal is feature-rich for demo/staging usage, but not yet hardened enough for real deployment

## Suggested Next Phases

### Phase 1: Stabilization

Focus on making the current feature set more reliable.

- Add more frontend test coverage for dashboard, search, case detail, and management flows
- Add focused backend tests for auth edge cases, role restrictions, and invalid workflow transitions
- Clean up security/auth configuration so login behavior is easier to maintain
- Reduce warning noise and document intentional configuration choices
- Review error messages and API consistency across auth, admin, and case modules

### Phase 2: Data and storage hardening

Prepare the app for longer-lived environments.

- Replace local-only file storage with a storage abstraction suitable for S3/object storage
- Introduce migration/versioning discipline for schema evolution
- Review seeded/demo-user assumptions and separate demo data from real deployment behavior
- Improve audit/history retention strategy
- Add backup and restore planning for documents and case metadata

### Phase 3: Frontend architecture improvement

Move from functional UI to maintainable product UI.

- Replace refresh-heavy data flows with structured query/state management
- Normalize shared case/user/dashboard data handling
- Add route guards and stronger auth/session handling in the React app
- Improve loading, empty, and failure states across dashboard pages
- Add reusable admin and workflow components to reduce duplication

### Phase 4: Real user workflows

Expand from demo operations into actual court portal flows.

- Full lawyer assignment and lawyer-specific workbench flows
- Better judge queue management and hearing workflow UX
- Notifications center with actionable read/unread and event grouping
- More complete registration onboarding and account recovery UX
- Document validation rules, file previews, and download/audit improvements

### Phase 5: Production readiness

Prepare for deployability and operations.

- Environment-specific configuration cleanup
- Centralized logging and monitoring
- Rate limiting and brute-force protection for auth flows
- Better secret management
- CI pipeline improvements with backend and frontend verification
- Deployment documentation and rollback plan

## Recommended Immediate Next Slice

If continuing right away, the best next slice is:

1. Add targeted frontend tests for track-case, hearings, and orders flows
2. Add focused backend tests for access restrictions around hearing/order management
3. Start storage abstraction work so evidence files and court orders are no longer tied directly to local disk

## Verification Reference

Most recent successful verification after the latest hearings/orders and stabilization change:

```bash
./mvnw clean test
```

Previously also verified for frontend builds with:

```bash
npm run build --prefix frontend-react
```

## Resume Prompt

If resuming in a new Codex session, use:

`Read HANDOFF.md in the Ecourt repo, inspect the current auth/case/hearings/orders implementation, and continue with Phase 1 stabilization by adding test coverage and deployment hardening.`
