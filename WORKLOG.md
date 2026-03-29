### 2026-03-30
- Added case search/filter/pagination endpoint (`GET /cases/search`) with scope, filter, range, and pagination support plus `CaseListResponse`. Extended service/repository and added integration coverage to ensure admin and client scopes behave correctly.
- Built audit trail feature (case creation, status changes, document uploads) persisting `CaseAuditEvent` entries and exposed `GET /cases/{caseNumber}/audit`, with integration test verifying workflow and order.
- Stabilized runtime by deploying the H2-specific demo data seed, ensuring admin `alisha` and placeholder cases exist before each run.
- Validated full backend behavior via `./mvnw test` (10 tests) and confirmed live server responses on `/cases/search` and audit endpoints.
