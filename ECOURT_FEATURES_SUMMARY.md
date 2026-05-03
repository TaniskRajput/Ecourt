# E-Court Case Tracker: Features & Flow Summary

## What This Project Is About
`E-Court` is a full-stack, role-aware digital case workflow system and public tracking platform built with **Spring Boot (Java)** for the backend and **React (Vite)** for the frontend. It is designed to modernize court and legal workflows by bringing together a secure internal portal for legal professionals and a transparent tracking layer for the public. 

The application addresses the complexities of the legal system, which involves multiple user roles, frequent status transitions, document-heavy case records, hearing schedules, and the need for public transparency.

---

## What Features It Offers

### 1. Authentication & Security
- **Secure Login:** JWT-based login using either username or email.
- **OTP Workflows:** Secure OTP-based email verification for new user registration and password resets.
- **Role-Based Access Control (RBAC):** Strict access control tailored for four primary roles: `CLIENT`, `LAWYER`, `JUDGE`, and `ADMIN`.
- **Legacy Support:** Backward compatibility for legacy user login while enforcing modern password policies for new accounts.

### 2. Comprehensive Case Management
- **Case Filing:** Users can file new cases, with the system automatically generating unique, deterministic Case Numbers.
- **Assignment & Workflow:** Admins can assign judges to cases. Judges and Admins can move cases through validated status transitions (e.g., Filed → Scrutiny → Hearing → Closed).
- **Advanced Search:** Paginated search and filtering by status, usernames, text queries, dates, and court names.
- **Case Dashboards:** Role-specific dashboard overviews showing recent cases, pending actions, and summary statistics.

### 3. Hearings, Orders & Documents
- **Hearing History:** Dedicated workflows to record hearing remarks and schedule next hearing dates.
- **Court Orders:** Separate, structured uploads for official court orders and judgments, capturing metadata like title, type, and date.
- **Evidence Management:** Upload and download capabilities for case evidence, stored separately from official court orders.
- **AI Insights:** A standalone Python microservice that analyzes case history to forecast next hearing dates and estimate overall case disposal times.

### 4. Public Transparency & Tracking
- **No-Login Tracking:** Public users can search for cases by case number, year, and court name without needing an account.
- **Public Records:** View the hearing history and securely download published court orders and judgments.

### 5. Administration & Auditing
- **User Management:** Admins can view, activate/deactivate users, and change user roles.
- **Immutable Audit Trail:** Every major action (case creation, judge assignment, status change, document upload) is securely logged in an unalterable audit history for accountability.

---

## How The Flow Works

The application supports multiple distinct workflows depending on the user interacting with the system.

### The Public Tracking Flow
1. **Search:** A citizen visits the public landing page and enters a Case Number, Year, and Court Name.
2. **View:** The system retrieves the public record of the case, displaying its current status and hearing history.
3. **Download:** The user can download any publicly available court orders or judgments associated with that case, ensuring transparency.

### The Internal Case Lifecycle Flow
1. **Registration/Login:** A user registers, verifies their email via OTP, and logs into the internal portal.
2. **Filing:** A `CLIENT` (or an `ADMIN` on their behalf) files a new case, uploading initial evidence documents. The system assigns a unique case number.
3. **Assignment:** An `ADMIN` reviews the new case and assigns it to a specific `JUDGE`.
4. **Progression & Hearings:** The assigned `JUDGE` updates the case status to indicate it is under scrutiny or ready for a hearing. As the case proceeds, the judge records hearing details, remarks, and next hearing dates.
5. **AI Forecasting:** During the active phases, the Python Insight Service analyzes the cadence of the hearings to provide real-time estimates on when the next hearing will occur and when the case might be disposed of.
6. **Judgments & Orders:** The `JUDGE` uploads official court orders. These documents are tagged with specific metadata and made available to the involved parties, and potentially the public.
7. **Closure & Auditing:** The case reaches a terminal state (e.g., `CLOSED`). Throughout this entire lifecycle, the system's audit trail records who made what changes and when, ensuring a complete historical record of the case's progression.
