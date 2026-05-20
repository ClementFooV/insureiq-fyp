# InsureIQ — AI-Powered Insurance Risk Assessment & Marketplace Platform

> A full-stack FinTech web application that automates insurance risk profiling, personalised plan matching, and end-to-end policy lifecycle management — built as a Final Year Project (FYP).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, React Router, Chart.js |
| **Backend** | Node.js, Express.js |
| **Database** | MySQL |
| **Authentication** | JWT, Google OAuth 2.0 |
| **AI Chatbot** | Gemini 2.5 Flash Lite (generation), Gemini text-embedding-004 (embeddings), RAG pipeline |
| **Security** | bcrypt, express-rate-limit, express-validator, CORS |
| **Utilities** | jsPDF, html2canvas (PDF report generation), Nodemailer (email notifications) |

---

## System Architecture

```
┌────────────────────┐        ┌──────────────────────┐        ┌──────────┐
│   React Frontend   │◄──────►│  Express.js Backend   │◄──────►│  MySQL   │
│   (Port 3000)      │  REST  │    (Port 5000)        │  SQL   │ Database │
│                    │  API   │                      │        │          │
│  • 28 Pages        │        │  • 14 Controllers     │        │ 12 Tables│
│  • 3 Role Dashboards        │  • 14 Route files     │        │          │
│  • Charts (Chart.js)│       │  • JWT Middleware      │        │          │
│  • AI Chat Widget  │        │  • RAG Pipeline        │        │          │
└────────────────────┘        └──────────────────────┘        └──────────┘
```

**Pattern:** MVC (Model-View-Controller)

---

## User Roles

| Role | Capabilities |
|------|-------------|
| **Individual** | Register, complete profile, take risk assessment, browse & apply for plans, file claims, view policy lifecycle, download PDF reports, use AI chatbot |
| **Provider** | Submit insurance plans for approval, manage plan listings, process applications (approve/reject), process claims (approve/reject with settlement), view analytics |
| **Admin** | Approve/reject provider plans, manage all users, create provider accounts, configure scoring engine (questions + weights), view platform-wide analytics, export CSV reports, manage AI knowledge base |

---

## Key Features

### Risk Assessment Engine
- Dynamic questionnaire fetched from the database (admin-configurable)
- Multi-category scoring: Age & Health, Financial Resilience, Insurance Gaps, Lifestyle Risks
- Configurable point weights per category stored in the database
- Risk classification: LOW / MEDIUM / HIGH
- Detailed score breakdown with explanations and recommendations

### Plan Matching Algorithm
- Rule-based matching of approved plans against user profile and risk assessment
- Criteria: age eligibility, coverage adequacy, premium affordability, insurance gap detection
- Ranked recommendations with match reasons shown to the user

### Policy Lifecycle
- Applications: pending → approved / rejected
- On approval: policy start date and end date (1 year) automatically set
- Cancellation: individual can cancel an active policy (blocked if a pending claim exists)

### Claims Management
- Individual files a claim against an approved policy with supporting documents
- Provider reviews, approves with settlement amount, or rejects with notes
- Email and in-app notifications sent at every status change

### AI Chatbot (RAG Pipeline)
- Hybrid retrieval: BM25 (70%) + cosine similarity (30%) over chunked knowledge base
- Embeddings: Gemini text-embedding-004 (768 dimensions), stored as BLOBs in MySQL
- Reranker: Xenova/bge-reranker-base
- Generation: Gemini 2.5 Flash Lite with a system prompt scoped to InsureIQ
- Knowledge base managed by admin — documents can be added, edited, or deleted without code changes

### Analytics Dashboards
- **Individual:** Score history (line chart), risk radar breakdown, application status
- **Provider:** Application pipeline (doughnut), plan performance (bar chart), average applicant risk score
- **Admin:** Platform-wide metrics — users by role, plans by status, applications by status, assessments by risk level

### CSV Export (Admin)
- Export users, assessments, applications, and feedback as CSV files

---

## Project Structure

```
InsureIQ/
├── backend/
│   ├── controllers/        # 14 controllers
│   ├── routes/             # 14 route files
│   ├── middleware/         # JWT auth + role middleware
│   ├── utils/              # Email helper
│   ├── helpers/            # Text polish, embedding utilities
│   ├── data/               # Markdown knowledge base files
│   ├── uploads/            # Claim document uploads
│   ├── db_setup.js         # Database schema & table creation
│   ├── index.js            # Express server entry point
│   └── .env                # Environment variables (not committed)
│
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI: DashboardLayout, ChatWidget, etc.
│   │   ├── pages/
│   │   │   ├── individual/ # 9 pages (dashboard, assessment, plans, claims, etc.)
│   │   │   ├── provider/   # 6 pages (plans, applications, claims, analytics)
│   │   │   └── admin/      # 9 pages (users, scoring, knowledge base, etc.)
│   │   ├── styles/         # CSS stylesheets
│   │   ├── utils/          # Auth token utilities
│   │   └── App.js          # Main router with protected routes
│   └── public/
│
└── README.md
```

---

## API Endpoints

### Authentication (`/api`)
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/register` | Public |
| POST | `/login` | Public |
| POST | `/google-login` | Public |
| POST | `/forgot-password` | Public |
| POST | `/reset-password` | Public |

### Applications (`/api/applications`)
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/apply` | Individual |
| GET | `/my-applications` | Individual |
| DELETE | `/:id/withdraw` | Individual |
| PUT | `/:id/cancel` | Individual |
| GET | `/provider-queue` | Provider |
| PUT | `/:id/status` | Provider |
| GET | `/admin/all` | Admin |

### Claims (`/api/claims`)
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/` | Individual |
| GET | `/my` | Individual |
| GET | `/provider` | Provider |
| PUT | `/:id/status` | Provider |
| GET | `/admin/all` | Admin |

### Plans (`/api/plans`)
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/approved` | Public |
| GET | `/matched` | Individual |
| GET | `/my-plans` | Provider |
| POST | `/` | Provider |
| PUT | `/:id` | Provider |
| GET | `/admin/all` | Admin |
| PUT | `/:id/status` | Admin |

### Scoring Config (`/api/scoring`)
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/questions` | Authenticated |
| GET | `/questions/all` | Admin |
| POST | `/questions` | Admin |
| PUT | `/questions/reorder` | Admin |
| PUT | `/questions/:id` | Admin |
| DELETE | `/questions/:id` | Admin |
| GET | `/weights` | Admin |
| PUT | `/weights/:key` | Admin |

### Analytics (`/api/analytics`)
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/individual` | Individual |
| GET | `/provider` | Provider |
| GET | `/dashboard` | Admin |

### Export (`/api/export`)
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/users` | Admin |
| GET | `/assessments` | Admin |
| GET | `/applications` | Admin |
| GET | `/feedback` | Admin |

### AI Chatbot (`/api/rag`)
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/ask` | Public |

### Knowledge Base (`/api/client`)
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/markdown` | Admin |
| GET | `/markdown` | Admin |
| PUT | `/markdown/:id` | Admin |
| DELETE | `/markdown/:id` | Admin |

---

## Getting Started

### Prerequisites
- Node.js v18+
- MySQL v8+
- Gemini API key (for AI chatbot and embeddings)
- Google OAuth credentials (for social login)
- SMTP email credentials (for email notifications)

### 1. Clone & Install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Environment Setup

Create `backend/.env`:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=insureiq
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash-lite-preview-06-17
GEMINI_EMBED_MODEL=text-embedding-004
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
```

### 3. Database Setup

```bash
cd backend
node db_setup.js
```

This creates all required tables and seeds default scoring weights and questions.

### 4. Run

```bash
# Terminal 1 — Backend
cd backend
node index.js
# Server running on http://localhost:5000

# Terminal 2 — Frontend
cd frontend
npm start
# App running on http://localhost:3000
```

---

## License

© 2026 InsureIQ. Built as a Final Year Project.
