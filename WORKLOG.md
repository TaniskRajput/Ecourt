### 2026-03-30
- Added case search/filter/pagination endpoint (`GET /cases/search`) with scope, filter, range, and pagination support plus `CaseListResponse`. Extended service/repository and added integration coverage to ensure admin and client scopes behave correctly.
- Built audit trail feature (case creation, status changes, document uploads) persisting `CaseAuditEvent` entries and exposed `GET /cases/{caseNumber}/audit`, with integration test verifying workflow and order.
- Stabilized runtime by deploying the H2-specific demo data seed, ensuring admin `alisha` and placeholder cases exist before each run.
- Validated full backend behavior via `./mvnw test` (10 tests) and confirmed live server responses on `/cases/search` and audit endpoints.

### 2026-04-01
- Added a role-aware dashboard summary endpoint (`GET /cases/dashboard`) so client, judge, and admin views can render recent cases, recent actions, and operational counts from backend data.
- Enriched case responses and search behavior with action permissions, allowed-next-status metadata, and sortable search support for realistic case tables.
- Improved audit semantics so judge assignment and case closure appear as dedicated audit events instead of generic status-only history.
- Reworked the React portal pages for overview, search, case detail, and management into a more realistic court portal experience backed by the upgraded APIs.
- Polished admin and judge workflows by refreshing dependent data after assignments, status updates, role changes, and activation changes, and added per-row loading states plus a manual refresh control.
- Re-verified the app with `./mvnw test` and `npm run build --prefix frontend-react`.
