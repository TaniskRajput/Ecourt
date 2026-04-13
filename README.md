# E-Court Case Tracker

A full-stack court case management and public tracking platform built with Spring Boot and React.

`Ecourt` is designed as a role-aware digital case workflow system for clients, lawyers, judges, and administrators. It combines secure authentication, case lifecycle management, hearing history, court order handling, notifications, and a public-facing case tracking experience in one application.

---

## Why This Project Exists

Court and legal workflows usually involve:

- many different user roles
- frequent status transitions
- document-heavy case records
- hearing schedules and judicial updates
- public access needs for case progress tracking

This project brings those concerns together into a single portal with:

- a secure backend API
- a dashboard-driven internal workflow
- a public tracking layer for hearing history and orders

---

## What It Offers

### Authentication and account lifecycle

- JWT-based login
- Login with username or email
- OTP-based registration flow
- OTP-based password reset flow
- Role-aware access control
- Support for legacy user password compatibility during login

### Role-based internal portal

Supported roles:

- `CLIENT`
- `LAWYER`
- `JUDGE`
- `ADMIN`

Each role sees different workflows and access permissions across the dashboard.

### Case management

- File new cases
- Generate unique case numbers automatically
- Assign judges
- Update case workflow status
- Search and filter cases
- View full structured case details
- Track case metadata like client, lawyer, judge, court name, dates, and status

### Hearings and orders

- Add hearing records to a case
- Track hearing remarks and next hearing dates
- Upload court orders and judgments
- Store order metadata such as:
  - order title
  - order type
  - order date

### Documents and audit trail

- Upload evidence documents
- Download uploaded files
- Separate evidence documents from court orders
- Maintain audit history for important case actions

### Public case tracking

- Search cases publicly by case number, year, and court
- View hearing history without logging in
- Download public court orders for tracked cases

### Admin operations

- Manage users
- Update roles
- Activate or deactivate accounts
- Review dashboard summaries and system-wide case activity

---

## Key Functional Areas

### Public-facing experience

- `Track Case` search
- hearing history view
- court orders and judgment downloads

### Internal dashboard

- dashboard overview
- case filing
- search and case lookup
- case detail and workflow view
- hearings and orders management
- user and case administration

---

## Tech Stack

### Backend

- Java 21
- Spring Boot
- Spring Security
- Spring Data JPA
- JWT
- MySQL
- H2 for local/demo/test profile support

### Frontend

- React
- Vite
- Axios
- React Router
- Framer Motion

### Storage

- Local filesystem storage for uploaded files

---

## Project Structure

```text
Ecourt/
├── src/main/java/com/ecourt
│   ├── config
│   ├── controller
│   ├── dto
│   ├── model
│   ├── repository
│   ├── security
│   └── service
├── src/main/resources
├── src/test/java/com/ecourt
├── frontend-react
│   ├── src
│   └── public
├── HANDOFF.md
└── pom.xml
```

---

## Main Functionalities at a Glance

| Area | What it does |
|---|---|
| Auth | Login, registration OTP, password reset OTP, role-aware sessions |
| Cases | Filing, assignment, status transitions, search, detail views |
| Hearings | Add hearing entries, track remarks, next hearing dates |
| Orders | Upload and list court orders and judgments |
| Documents | Upload/download supporting files and evidence |
| Public Tracking | Search case history without authentication |
| Admin | User management, activation, role updates, oversight |
| Audit | Immutable event history for major workflow actions |

---

## Local Development Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd Ecourt
```

### 2. Configure the backend

Update the database settings in:

- `src/main/resources/application.properties`

Important environment values:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/ecourt_db
spring.datasource.username=root
spring.datasource.password=${ECOURT_DB_PASSWORD:yourpassword}
security.jwt.secret=${ECOURT_JWT_SECRET:dev-only-change-this-jwt-secret-before-production-1234567890}
```

### 3. Run the backend

```bash
./mvnw spring-boot:run
```

By default the backend runs on:

```text
http://localhost:8081
```

### 4. Run the frontend

```bash
cd frontend-react
npm install
npm run dev
```

By default the frontend runs on:

```text
http://localhost:5173
```

---

## Build and Verification

### Backend tests

```bash
./mvnw test
```

### Frontend production build

```bash
npm run build --prefix frontend-react
```

---

## API Highlights

### Auth

- `POST /auth/login`
- `POST /auth/register/request-otp`
- `POST /auth/register/verify-otp`
- `POST /auth/register/complete`
- `POST /auth/password/request-reset`
- `POST /auth/password/verify-otp`
- `POST /auth/password/reset`

### Cases

- `POST /cases`
- `GET /cases/my`
- `GET /cases/all`
- `GET /cases/search`
- `GET /cases/{caseNumber}`
- `PUT /cases/{caseNumber}/assign`
- `PUT /cases/{caseNumber}/status`

### Hearings and orders

- `POST /cases/{caseNumber}/hearings`
- `GET /cases/{caseNumber}/hearings`
- `POST /cases/{caseNumber}/orders`
- `GET /cases/{caseNumber}/orders`

### Public tracking

- `GET /public/cases/track`
- `GET /public/cases/{caseNumber}`
- `GET /public/cases/{caseNumber}/orders/{documentId}/download`

---

## Current State

This project is already beyond a basic CRUD prototype. It currently supports:

- internal role-based case operations
- public case tracking
- hearings and court order workflows
- OTP-backed auth flows
- admin user operations
- auditability across the case lifecycle

It is best described as a strong demo/staging platform moving toward production readiness.

---

## Known Limitations

- Google sign-in is only a placeholder right now
- File storage is local and not yet abstracted for object storage like S3
- Production deployment requires hosting the backend separately from Vercel if the frontend is deployed there
- The project still needs more frontend test coverage and deployment hardening

---

## Suggested Next Steps

- add frontend tests for public tracking, hearings, and orders
- strengthen deployment and environment setup
- move uploaded file storage to a replaceable storage abstraction
- improve production monitoring, rate limiting, and secrets management

---

## Documentation Notes

Helpful project context lives in:

- [HANDOFF.md](./HANDOFF.md) for current project state and continuation guidance
- [HELP.md](./HELP.md) for framework reference links generated with the project

---

## License

This repository currently does not define a formal license.
