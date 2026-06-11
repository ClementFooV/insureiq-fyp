# InsureIQ — Study Guide
> Plain English. Every page. Every logic flow.

---

## TABLE OF CONTENTS

1. [How the System Works (Big Picture)](#big-picture)
2. [The Token System](#token-system)
3. [Login Page](#login)
4. [Profile Setup](#profile)
5. [Risk Assessment](#assessment)
6. [How the Risk Score is Calculated](#scoring)
7. [Results Page](#results)
8. [Browse Plans](#browse)
9. [How Plan Matching Works](#matching)
10. [My Applications](#applications)
11. [My Claims](#claims)
12. [Individual Dashboard](#individual-dashboard)
13. [Assessment History](#history)
14. [Risk Matrix](#matrix)
15. [Provider Dashboard](#provider-dashboard)
16. [Add / Edit / My Plans](#plans)
17. [Provider Applications](#provider-apps)
18. [Provider Claims](#provider-claims)
19. [Admin Dashboard](#admin-dashboard)
20. [Admin Plan Approval](#plan-approval)
21. [Admin User Management](#user-mgmt)
22. [Admin Scoring Config](#scoring-config)
23. [Admin Knowledge Base](#knowledge)
24. [Admin Read-Only Views](#admin-readonly)
25. [AI Chatbot — RAG Pipeline](#rag)
26. [Notifications](#notifications)
27. [Protected Routes](#protected)
28. [Other Pages](#other)
29. [Full File Map](#filemap)

---

## 1. HOW THE SYSTEM WORKS (BIG PICTURE) {#big-picture}

InsureIQ has 3 parts:

- **Frontend (React)** — what the user sees in the browser. Port 3000.
- **Backend (Express.js)** — the server that handles all logic and database queries. Port 5000.
- **Database (MySQL)** — stores everything: users, assessments, plans, applications, claims.

The pattern is always the same for every feature:
```
User does something on the page
  → Page sends a request to the backend
  → Backend checks your token (who are you, what role)
  → Backend controller runs the logic
  → Controller queries the database
  → Sends the result back as JSON
  → Page displays the result
```

There are 3 user roles:
- **Individual** — takes assessments, browses plans, applies, files claims
- **Provider** — submits plans, reviews applications, processes claims
- **Admin** — approves plans, manages users, configures the scoring engine, manages AI knowledge base

---

## 2. THE TOKEN SYSTEM {#token-system}

When you log in successfully, the server creates a **JWT token** — like a digital ID card.

- The token contains your `id`, `name`, `email`, and `role`
- It expires after **1 hour**
- Your browser saves it in `localStorage`

Every time you click anything that needs login, your browser automatically sends this token with the request. The server reads it, checks it's valid, and knows who you are.

If the token is missing, expired, or fake → server blocks the request → you get redirected to login.

> **In code:** `frontend/src/utils/auth.js` → `getToken()` | `backend/middleware/authMiddleware.js`

---

## 3. LOGIN PAGE {#login}

**Route:** `/login`

One page, three different forms — it just swaps which form is shown:
- `login` view → Login form
- `register` view → Register form
- `forgot` view → Forgot password form

### Register
1. Fill in name, email, password, confirm password
2. As you type the password, **5 live ticks** appear showing whether your password meets the rules (length, uppercase, lowercase, number, special character)
3. Click Create Account → server checks if email already exists
4. If not: **hashes** the password (bcrypt — scrambles it so it can never be read back)
5. Saves user to database → returns success → page switches back to login

### Login
1. Type email + password
2. Server finds your account by email
3. Checks if account is suspended → blocks with error if yes
4. Checks if it's a Google-only account (no password set) → tells you to use Google
5. Runs `bcrypt.compare` — compares typed password against the stored scrambled version
6. If match: creates a JWT token with your id, name, email, role → sends it back
7. Browser saves the token → reads your role → redirects:
   - `admin` → `/admin/dashboard`
   - `provider` → `/provider/dashboard`
   - `individual` → `/dashboard`

### Google Login
1. Click the Google button → Google's popup appears
2. Google gives back a credential token (proof you're really you)
3. Server verifies it directly with Google's API (cannot be faked)
4. If new user → creates account automatically (no password)
5. If existing user → finds their account
6. Creates the same JWT token → same redirect as normal login

### Forgot Password
1. Type your email
2. Server generates a random secret token, saves it with a 1-hour expiry
3. Sends an email with a reset link containing that token
4. **Always returns the same success message** whether the email exists or not — prevents attackers from testing which emails are registered
5. User clicks the link → lands on Reset Password page → types new password → server checks token is valid and not expired → updates password → marks token as used

> **In code:** `Login.js` → `authController.js` (register, login, googleLogin, forgotPassword) | `ResetPassword.js` → `authController.js` (resetPassword)

---

## 4. PROFILE SETUP {#profile}

**Route:** `/profile-setup`

After registering, the individual fills in personal info used for risk scoring:
- Age, monthly income, employment status
- Total savings, total liabilities (debts)
- Number of dependents
- Health status (Excellent / Good / Fair / Poor)
- Smoker (Yes / No)

Click Save → all data saved to database.

**Why this matters:** The risk assessment engine reads all these values when calculating your score. Without completing your profile, you cannot take the assessment.

> **In code:** `ProfileSetup.js` → `profileController.js`

---

## 5. RISK ASSESSMENT {#assessment}

**Route:** `/assessment`

Shows one question at a time with a slide animation. Progress bar at the top shows how far along you are. You click an answer → automatically moves to the next question. You can go back.

When you answer the last question, it submits automatically and shows "Analyzing your risk profile..."

**Where do the questions come from?**
The questions are stored in the **database**, not hardcoded in the code. The page fetches them fresh every time. This means if admin adds, removes, or edits a question, it takes effect immediately for everyone — no code change needed.

> **In code:** `RiskAssessment.js` → `scoringConfigController.js` (fetch questions) → `assessmentController.js` (submitAssessment)

---

## 6. HOW THE RISK SCORE IS CALCULATED {#scoring}

This is the most important logic in the whole system. Everything happens on the backend after you submit the assessment.

### Two-part scoring

**Part A — Profile scoring**

Your saved profile data is scored automatically:

| Factor | Condition | Points |
|--------|-----------|--------|
| Age | 56+ | 20 pts |
| Age | 46–55 | 16 pts |
| Age | 36–45 | 12 pts |
| Age | 26–35 | 8 pts |
| Age | Under 26 | 5 pts |
| Smoker | Yes | 20 pts |
| Health | Poor | 25 pts |
| Health | Fair | 15 pts |
| Health | Good | 5 pts |
| Dependents | 4+ | 20 pts |
| Dependents | 3 | 15 pts |
| Dependents | 2 | 10 pts |
| Dependents | 1 | 5 pts |
| Debt-to-Income ratio | Over 60% | 20 pts |
| Debt-to-Income ratio | 40–60% | 15 pts |
| Debt-to-Income ratio | 20–40% | 10 pts |
| Employment | Unemployed | 15 pts |
| Employment | Part-time/Contract | 12 pts |
| Employment | Self-employed | 10 pts |
| Monthly income | Under RM2,500 | 15 pts |
| Monthly income | RM2,500–RM4,000 | 10 pts |
| Savings | Under RM5,000 | 15 pts |
| Savings | RM5,000–RM20,000 | 10 pts |

*Debt-to-Income = total debts ÷ monthly income × 100*

**Part B — Questionnaire scoring**

Your answers to the questions also add points. Each answer option has a score value stored in the database. For example:
- "Do you have life insurance?" → "No" → adds points to Insurance Gaps
- "Occupation type?" → "High-risk" → adds points to Lifestyle Risks

### 4 score categories
All points go into one of these:
1. **Age & Health**
2. **Financial Resilience**
3. **Insurance Gaps**
4. **Lifestyle Risks**

### Risk level
All 4 categories are added together:
- **0–90** → LOW risk
- **91–180** → MEDIUM risk
- **181+** → HIGH risk

These thresholds are stored in the database and can be changed by admin.

### Important: nothing is hardcoded
All point values, question options, and thresholds come from the database. Admin can change them anytime from the Admin Scoring Config page. The assessment engine always reads the latest values.

### Coverage recommendations
After getting the risk level, the system also calculates 5 recommended coverage amounts:

| Type | How it's calculated |
|------|-------------------|
| Life Insurance | (income × 12 × riskMultiplier) + total debts + (dependents × RM75,000). Clamped to RM100k–RM2M |
| Medical | RM100k (LOW) / RM150k (MEDIUM) / RM250k (HIGH) |
| Critical Illness | income × 12 × multiplier — 2× LOW, 3× MEDIUM, 5× HIGH |
| Personal Accident | RM150k desk job / RM250k manual / RM400k high-risk occupation |
| Income Protection | income × 75% × months (12 months LOW, 24 months MEDIUM/HIGH) |

All of this is saved to the database as JSON.

> **In code:** `assessmentController.js` → `submitAssessment` function (all scoring logic lives here)

---

## 7. RESULTS PAGE {#results}

**Route:** `/results`

After the assessment, you see:
- Your risk level badge (LOW / MEDIUM / HIGH) — colour coded green/orange/red
- Your total score in a circle
- Up to 4 explanation bullets — "Why did you receive this score?"
- Score breakdown bar chart — shows how many points came from each of the 4 categories
- 5 coverage recommendation cards — one per insurance type
- Each card has a "View Matched Plans →" button that takes you to Browse Plans filtered by that type

**PDF Download:**
Clicks a button → takes a screenshot of the results div → converts it into a PDF file → downloads it as `InsureIQ_Risk_Report_<timestamp>.pdf`

**Feedback widget:**
At the bottom, you rate 1–5 stars and optionally leave a comment. Submitted to the database. Admin can view all feedback in the Admin Feedback page.

> **In code:** `Results.js` → `assessmentController.js` (getLatestAssessment) | feedback → `feedbackController.js`

---

## 8. BROWSE PLANS {#browse}

**Route:** `/browse-plans`

Two tabs:
- **Recommended** — plans matched specifically to you based on your profile + assessment
- **All Plans** — every approved plan on the platform

Filter bar: filter by insurance type, set a minimum coverage, set a max monthly premium, search by plan name or provider name.

**Auto-Fill button** — reads your risk level from your latest assessment and sets smart filter defaults automatically (HIGH → min coverage RM200k, MEDIUM → RM100k, LOW → RM50k).

**Plan card** — shows provider name, coverage amount, monthly premium, age eligibility. Click "Show details" to see features and exclusions. Tick "Compare" on up to 3 plans and a side-by-side table pops up.

**Applying for a plan:**
1. Click "Apply Now"
2. A modal pops up showing which plan you're applying for
3. It confirms your risk assessment will be shared with the provider
4. Fill in your name, email, phone number (validated as Malaysian format)
5. Click Submit → application sent to the provider
6. Redirected to My Applications

You must have completed a risk assessment before applying. The provider needs to see your risk score.

> **In code:** `BrowsePlans.js` → `planController.js` (getApprovedPlans, getMatchedPlans) | apply → `applicationController.js` (applyForPlan)

---

## 9. HOW PLAN MATCHING WORKS {#matching}

For each approved plan in the database, the system scores it against your profile using 4 criteria:

| Criterion | Points | Condition |
|-----------|--------|-----------|
| Coverage fit | +3 | Plan's coverage is between your recommended amount and 1.5× that amount |
| Age eligibility | +2 | Your age is within the plan's min–max age range |
| Affordability | +2 | Plan's monthly premium is within 15% of your monthly income |
| Insurance gap | +1 | You answered "No" to having this type of coverage in the questionnaire |

**Maximum score = 8 points.**
A plan needs at least **2 points** to appear in Recommended. Plans sorted highest score first.

> **In code:** `planController.js` → `getMatchedPlans` function

---

## 10. MY APPLICATIONS {#applications}

**Route:** `/my-applications`

Shows all plans you've applied for. Each shows:
- Plan name, provider, date applied
- Coverage and premium amounts
- Status: Pending / Approved / Rejected / Cancelled
- Provider's notes if rejected
- Policy start and end date if approved (always 1 year)

**What you can do:**

| Status | Action |
|--------|--------|
| Pending | Withdraw (deletes the application completely) |
| Approved | File a Claim OR Cancel Policy |
| Rejected | View only |
| Cancelled | View only |

**Cancelling a policy:**
- Only works on approved policies
- Blocked if there's a pending claim — you must resolve the claim first
- Sets the policy end date to today

**Filing a claim:**
1. Click "File a Claim" → a modal opens
2. Choose claim type — options depend on plan type:
   - Life plan → Death or Disability
   - Medical → Medical
   - Critical Illness → Critical Illness
   - Personal Accident → Accident, Disability, or Death
3. Fill in incident date, description, claimed amount (cannot exceed coverage amount)
4. Optionally attach documents (PDF, JPG, PNG — up to 5 files)
5. Submit → redirected to My Claims

> **In code:** `MyApplications.js` → `applicationController.js` (getMyApplications, withdrawApplication, cancelPolicy) | claim → `claimController.js` (submitClaim)

---

## 11. MY CLAIMS {#claims}

**Route:** `/my-claims`

Shows all claims you've filed:
- Plan name and insurance type
- Claim type and incident date
- Amount you claimed
- Status: Pending / Approved / Rejected
- If approved → the settlement amount (what the provider actually pays out)
- If rejected → the provider's notes explaining why

> **In code:** `MyClaims.js` → `claimController.js` (getMyClaims)

---

## 12. INDIVIDUAL DASHBOARD {#individual-dashboard}

**Route:** `/dashboard`

Your home screen after login. Shows:
- Line chart — your risk score over time (all past assessments)
- Radar chart — your latest score breakdown by category
- Application status counts (pending, approved, rejected)
- Quick action buttons to key pages
- If no assessment taken yet → prompts you to complete one

> **In code:** `IndividualDashboard.js` → `analyticsController.js` (getIndividualAnalytics)

---

## 13. ASSESSMENT HISTORY {#history}

**Route:** `/assessment-history`

Shows all past assessments you've taken, newest first. Each entry shows the date, score, risk level, and the coverage recommendations from that time. Useful to track if your risk has improved or worsened over time.

> **In code:** `AssessmentHistory.js` → `assessmentController.js` (getAssessmentHistory)

---

## 14. RISK MATRIX {#matrix}

**Route:** `/scoring-matrix`

A read-only reference page. Shows the full scoring table — every factor, how many points each is worth, what the thresholds are for LOW / MEDIUM / HIGH. Linked from the Results page.

> **In code:** `RiskMatrix.js` → `scoringConfigController.js` (getWeights, getQuestions)

---

## 15. PROVIDER DASHBOARD {#provider-dashboard}

**Route:** `/provider/dashboard`

Three data cards/charts scoped to this provider only:
- Doughnut chart — applications by status (pending / approved / rejected)
- Plans by status counts
- Average risk score of all their applicants

> **In code:** `ProviderDashboard.js` → `analyticsController.js` (getProviderAnalytics)

---

## 16. ADD / EDIT / MY PLANS {#plans}

**Routes:** `/provider/add-plan`, `/provider/edit-plan/:id`, `/provider/my-plans`

### Adding a plan
Provider fills in: plan name, insurance type, coverage amount, monthly premium, min age, max age, description, features list, exclusions list.

Submit → plan saved with status **Pending** → admin must approve before it's visible on Browse Plans.

### My Plans
Shows all plans the provider has submitted with their status. If rejected, shows the admin's rejection reason.

### Editing a plan
Provider can edit any plan. When saved → status automatically resets to **Pending** and rejection reason is cleared → must go through admin approval again.

> **In code:** `AddPlan.js` / `EditPlan.js` / `MyPlans.js` → `planController.js` (addPlan, updatePlan, getMyPlans)

---

## 17. PROVIDER APPLICATIONS {#provider-apps}

**Route:** `/provider/applications`

Shows all applications individuals have submitted for this provider's plans.

For each application, the provider can see:
- Applicant name, email, phone
- Which plan they applied for
- Their **risk score and risk level** from their assessment — this is how the provider decides whether to approve

**Actions:**
- **Approve** → policy activated; system sets start date = today, end date = +1 year; individual gets in-app notification + email
- **Reject** → provider writes a reason; individual gets in-app notification + email with the reason

> **In code:** `ProviderApplications.js` → `applicationController.js` (getProviderApplications, updateApplicationStatus)

---

## 18. PROVIDER CLAIMS {#provider-claims}

**Route:** `/provider/claims`

Shows all claims filed against this provider's plans. Pending claims appear first.

For each claim, the provider sees: applicant details, which plan, claim type, incident date, description, amount claimed, attached documents, applicant's risk score.

**Actions:**

**Approve:**
- Must enter a settlement amount (what they'll actually pay out)
- Settlement amount cannot exceed the plan's coverage amount
- Individual gets notification + email: "Your claim has been approved. Settlement: RM X"

**Reject:**
- Must write a reason
- Individual gets notification + email with the reason

A claim can only be processed once. Once approved or rejected, it's locked.

Tabs (All / Pending / Approved / Rejected) and search filter on the frontend — no extra API call.

> **In code:** `ProviderClaims.js` → `claimController.js` (getProviderClaims, updateClaimStatus)

---

## 19. ADMIN DASHBOARD {#admin-dashboard}

**Route:** `/admin/dashboard`

Platform-wide numbers at a glance:
- Total users broken down by role (individuals, providers, admins)
- Total plans broken down by status
- Total assessments, average risk score, how many are LOW / MEDIUM / HIGH
- Total applications broken down by status

All displayed as charts and number cards.

> **In code:** `AdminDashboard.js` → `analyticsController.js` (getDashboardMetrics)

---

## 20. ADMIN PLAN APPROVAL {#plan-approval}

**Route:** `/admin/plan-approval`

Admin sees all plans submitted by all providers. Can filter by status.

**Approve** → plan goes live on Browse Plans for all individuals. Provider gets in-app notification + email.

**Reject** → admin writes a reason. Provider gets in-app notification + email. Provider can edit and resubmit.

> **In code:** `AdminPlanApproval.js` → `planController.js` (getAllPlans, updatePlanStatus)

---

## 21. ADMIN USER MANAGEMENT {#user-mgmt}

**Route:** `/admin/user-management`

Admin sees all registered users.

**Actions:**
- **Create Provider account** — providers cannot self-register. Admin must create their account and give them the credentials.
- **Suspend** — user gets "Your account has been suspended" error when they try to login. They can't do anything until reactivated.
- **Activate** — un-suspends a user.
- **Delete** — permanently removes the user.

> **In code:** `AdminUserManagement.js` → `userController.js` (getAllUsers, createProvider, updateUserStatus, deleteUser)

---

## 22. ADMIN SCORING CONFIG {#scoring-config}

**Route:** `/admin/scoring-config`

Controls the entire risk assessment engine without touching any code.

**Questions tab:**
- Add new questions with custom answer options and point values per option
- Edit existing questions (text, options, scores)
- Deactivate questions — they disappear from the assessment immediately
- Reorder questions — changes the sequence individuals see them
- Each answer option can award points to a specific category

**Scoring Weights tab:**
- Change how many points each profile factor is worth (e.g. change "smoker" from 20 pts to 30 pts)
- Change the risk thresholds (e.g. change HIGH from 181 to 200)

All changes take effect immediately for all future assessments.

> **In code:** `AdminScoringConfig.js` → `scoringConfigController.js` (all question + weight CRUD)

---

## 23. ADMIN KNOWLEDGE BASE {#knowledge}

**Route:** `/admin/knowledge`

Admin manages the documents the AI chatbot uses to answer questions.

**Upload a document:**
1. Admin writes or pastes a markdown document
2. Backend splits it into small chunks (paragraphs)
3. Each chunk is sent to Google's Gemini AI to generate an **embedding** — 768 numbers representing the meaning of that chunk
4. Both the text and the numbers are saved to the database

When a user asks the chatbot something, the system searches these chunks to find the most relevant ones.

**Edit** — updates the document text and re-generates all embeddings.

**Delete** — removes the document and all its chunks from the database.

> **In code:** `AdminKnowledgeBase.js` → `chunkController.js` (upload, edit, delete documents + generate embeddings)

---

## 24. ADMIN READ-ONLY VIEWS {#admin-readonly}

These pages give admin oversight across the whole platform. No approve/reject actions.

**All Applications** `/admin/applications` — every application across all providers and all individuals. Shows risk score, status, plan, provider.

**All Claims** `/admin/claims` — every claim filed across the entire platform.

**All Assessments** `/admin/assessments` — every assessment taken by every user. Admin can also delete individual assessments.

**Feedback** `/admin/feedback` — all star ratings and comments submitted after assessments.

**CSV Export** — admin can export users, assessments, applications, and feedback as CSV files.

> **In code:** `AdminApplications.js` → `applicationController.js` (getAllApplications) | `AdminClaims.js` → `claimController.js` (getAllClaims) | `AdminAssessments.js` → `assessmentController.js` (getAllAssessments) | `AdminFeedback.js` → `feedbackController.js` | CSV → `exportController.js`

---

## 25. AI CHATBOT — RAG PIPELINE {#rag}

**RAG = Retrieval-Augmented Generation.**
Instead of the AI guessing from its training data, it first searches the knowledge base, finds the most relevant documents, then uses those as context to answer your question.

### Step-by-step when you send a message

**Step 1 — Translate**
Your question is sent to Gemini with the instruction: "translate to English if not already English." This makes Malay and Chinese queries work properly with the search.

**Step 2 — Embed**
The translated question is sent to the Gemini embedding API. It returns 768 numbers — a vector representing the **meaning** of your question in mathematical space.

**Step 3 — Search the database**
Runs a query fetching all chunks from the database. MySQL's built-in full-text search gives each chunk a **BM25 score** — how many of your keywords appear in that chunk.

**Step 4 — Cosine similarity**
For each chunk, calculates how similar the chunk's stored vector is to your question's vector. Chunks that mean the same thing even with different words score high.

**Step 5 — Combine scores**
```
Final score = (cosine similarity × 70%) + (BM25 keyword score × 30%)
```
Meaning similarity is weighted more than keyword matching.

**Step 6 — Reranker**
Top 15 results are taken. These are sent to a small AI model (BGE reranker from HuggingFace). It re-scores each chunk's relevance. Top 5 are kept.

**Step 7 — Generate answer**
The top 5 chunk texts are joined as "context". Sent to Gemini Flash Lite with:
- A system prompt: "You are an assistant for InsureIQ. Only answer InsureIQ/insurance questions. Refuse off-topic questions like weather, recipes, politics."
- The context text
- The user's original question

Gemini reads the context and generates an answer.

**Step 8 — Display**
The answer appears in the chat bubble.

> **In code:** `ChatWidget.js` → `ragController.js` (ask → geminiTranslate → embed → retrieve → rerank → generateAnswer)

---

## 26. NOTIFICATIONS {#notifications}

The bell icon in the topbar. Red dot appears when you have unread notifications.

### What triggers a notification

| Event | Who is notified |
|-------|----------------|
| Individual applies for a plan | Provider |
| Provider approves/rejects application | Individual |
| Individual files a claim | Provider |
| Provider approves/rejects claim | Individual |
| Admin approves/rejects a plan | Provider |

Every notification also triggers an **email** at the same time. So every status change = in-app notification + email.

Click the bell → dropdown list of notifications. Click one → marks it as read.

> **In code:** `NotificationBell.js` → `notificationController.js` | emails → `emailHelper.js`

---

## 27. PROTECTED ROUTES {#protected}

Every page is protected. When you try to visit a page:

**Frontend check:** Is there a token in the browser? Does it have the right role for this page? If not → redirected to login.

**Backend check:** Every API call also verifies the token. Even if someone bypasses the frontend by typing the URL, the backend still blocks the request.

This prevents individuals from visiting `/admin/dashboard` just by typing it in the URL bar.

> **In code:** `ProtectedRoute.js` (frontend) | `authMiddleware.js` (backend)

---

## 28. OTHER PAGES {#other}

**Landing Page** `/` — marketing homepage before login. Shows features, how it works, Register/Login buttons. No backend calls.

**Reset Password** `/reset-password` — you land here from the password reset email. Reads the token from the URL. You type a new password → server checks token is valid and not expired → updates your password → token is marked as used so it can't be reused.

**404 Not Found** — if you type any URL that doesn't exist, shows a 404 page with a button to go home.

> **In code:** `Landing.js` (no backend) | `ResetPassword.js` → `authController.js` (resetPassword) | `NotFound.js` (no backend)

---

## 29. FULL FILE MAP {#filemap}

### Frontend Pages

| File | Route | What it does |
|------|-------|-------------|
| `pages/Landing.js` | `/` | Marketing homepage |
| `pages/Login.js` | `/login` | Login, register, Google OAuth, forgot password |
| `pages/ResetPassword.js` | `/reset-password` | Reset password from email link |
| `pages/NotFound.js` | `*` | 404 page |
| `pages/individual/IndividualDashboard.js` | `/dashboard` | Individual home with charts |
| `pages/individual/ProfileSetup.js` | `/profile-setup` | Save personal info for risk scoring |
| `pages/individual/RiskAssessment.js` | `/assessment` | Questionnaire, one question at a time |
| `pages/individual/Results.js` | `/results` | Risk score, recommendations, PDF, feedback |
| `pages/individual/AssessmentHistory.js` | `/assessment-history` | All past assessments |
| `pages/individual/RiskMatrix.js` | `/scoring-matrix` | Read-only scoring reference table |
| `pages/individual/BrowsePlans.js` | `/browse-plans` | Browse and apply for plans |
| `pages/individual/MyApplications.js` | `/my-applications` | Track applications, file claims, cancel policy |
| `pages/individual/MyClaims.js` | `/my-claims` | View all filed claims |
| `pages/provider/ProviderDashboard.js` | `/provider/dashboard` | Provider charts and analytics |
| `pages/provider/AddPlan.js` | `/provider/add-plan` | Submit new plan for approval |
| `pages/provider/EditPlan.js` | `/provider/edit-plan/:id` | Edit existing plan |
| `pages/provider/MyPlans.js` | `/provider/my-plans` | View all submitted plans with status |
| `pages/provider/ProviderApplications.js` | `/provider/applications` | Review and approve/reject applications |
| `pages/provider/ProviderClaims.js` | `/provider/claims` | Review and approve/reject claims |
| `pages/admin/AdminDashboard.js` | `/admin/dashboard` | Platform-wide metrics |
| `pages/admin/AdminPlanApproval.js` | `/admin/plan-approval` | Approve/reject provider plans |
| `pages/admin/AdminUserManagement.js` | `/admin/user-management` | Create/suspend/delete users |
| `pages/admin/AdminScoringConfig.js` | `/admin/scoring-config` | Edit questions and scoring weights |
| `pages/admin/AdminKnowledgeBase.js` | `/admin/knowledge` | Manage AI chatbot documents |
| `pages/admin/AdminApplications.js` | `/admin/applications` | View all applications (read-only) |
| `pages/admin/AdminClaims.js` | `/admin/claims` | View all claims (read-only) |
| `pages/admin/AdminAssessments.js` | `/admin/assessments` | View all assessments, can delete |
| `pages/admin/AdminFeedback.js` | `/admin/feedback` | View all star ratings |

### Frontend Components

| File | What it does |
|------|-------------|
| `components/DashboardLayout.js` | Sidebar + topbar used by every dashboard page |
| `components/ChatWidget.js` | Purple AI chat bubble on every page |
| `components/NotificationBell.js` | Bell icon in topbar, shows unread notifications |
| `components/ProtectedRoute.js` | Checks token + role before showing any page |
| `utils/auth.js` | `getToken()` — reads JWT from localStorage |
| `config.js` | `API_BASE` — the backend URL used by every fetch call |

### Backend Controllers

| File | What it handles |
|------|----------------|
| `controllers/authController.js` | register, login, Google login, forgot/reset/change password |
| `controllers/profileController.js` | save and get user profile |
| `controllers/assessmentController.js` | submit assessment, calculate risk score, get results, history |
| `controllers/scoringConfigController.js` | admin CRUD for questions and scoring weights |
| `controllers/planController.js` | add/edit/approve/reject plans, plan matching algorithm |
| `controllers/applicationController.js` | apply, withdraw, cancel, approve/reject applications |
| `controllers/claimController.js` | submit, approve/reject claims |
| `controllers/analyticsController.js` | chart data for all 3 dashboards |
| `controllers/userController.js` | admin: create provider, suspend, delete users |
| `controllers/ragController.js` | AI chatbot: translate, embed, BM25+cosine, rerank, Gemini answer |
| `controllers/chunkController.js` | admin: upload/edit/delete knowledge base documents + embeddings |
| `controllers/notificationController.js` | get notifications, mark read, delete |
| `controllers/feedbackController.js` | save and get star ratings |
| `controllers/exportController.js` | export data as CSV files |

### Backend Other Files

| File | What it does |
|------|-------------|
| `index.js` | Server entry point — CORS, rate limiting, DB connection, all 14 routes registered |
| `middleware/authMiddleware.js` | Verifies JWT token + checks role on every protected route |
| `utils/emailHelper.js` | Sends emails for every status change event |
| `helpers/textPolishHelper.js` | Cosine similarity math + vector conversion for RAG |
| `db_setup.js` | Creates all database tables, seeds default questions and weights. Run once. |
| `routes/` (14 files) | Each file maps URL paths to controller functions with the right middleware |

---

## QUICK REFERENCE — WHO CALLS WHAT

```
INDIVIDUAL:
  Register / Login         → Login.js → authController
  Fill Profile             → ProfileSetup.js → profileController
  Take Assessment          → RiskAssessment.js → assessmentController (calculates score)
  See Results              → Results.js → assessmentController (getLatestAssessment)
  Browse Plans             → BrowsePlans.js → planController (matching + all approved)
  Apply for Plan           → BrowsePlans.js → applicationController (applyForPlan)
  Track Applications       → MyApplications.js → applicationController
  File Claim               → MyApplications.js → claimController (submitClaim)
  Track Claims             → MyClaims.js → claimController (getMyClaims)

PROVIDER:
  Add Plan                 → AddPlan.js → planController (addPlan)
  View My Plans            → MyPlans.js → planController (getMyPlans)
  Review Applications      → ProviderApplications.js → applicationController
  Process Claims           → ProviderClaims.js → claimController
  See Analytics            → ProviderDashboard.js → analyticsController

ADMIN:
  Approve Plans            → AdminPlanApproval.js → planController
  Manage Users             → AdminUserManagement.js → userController
  Configure Scoring        → AdminScoringConfig.js → scoringConfigController
  Manage AI Docs           → AdminKnowledgeBase.js → chunkController
  View Metrics             → AdminDashboard.js → analyticsController

AI CHATBOT (any page):
  User types message
    → ChatWidget.js → ragController
       1. geminiTranslate  — translate to English
       2. embed            — convert to vector (768 numbers)
       3. SQL search       — BM25 keyword score for all chunks
       4. cosine math      — meaning similarity for all chunks
       5. combine scores   — cosine×70% + BM25×30%
       6. reranker         — BGE model re-scores top 15, keeps top 5
       7. generateAnswer   — Gemini reads context + question → answer
    → ChatWidget.js displays the answer
```

---

*InsureIQ — Final Year Project*
