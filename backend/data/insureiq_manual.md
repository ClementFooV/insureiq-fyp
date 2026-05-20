# Comprehensive InsureIQ Master Manual & Functional Guide

Welcome to the official, exhaustive guide to the InsureIQ Platform. This document outlines every single detail, algorithm, user flow, and business rule within the ecosystem. The AI knowledge base uses this document to answer queries accurately.

---

## 1. Introduction to the InsureIQ Platform

**Description:**
InsureIQ is an AI-powered Insurance Risk Assessment and Marketplace Platform built as a full-stack FinTech application. Its core mission is to automate the highly complex insurance risk profiling process, provide users with tailored, data-driven insurance plan recommendations, and manage the entire lifecycle of policy applications from start to finish.

**Core Architecture Layers:**
- **Frontend Layer:** React 18 single-page application utilizing React Router for navigation and Chart.js for all analytical dashboards. It includes PDF generation for user reports.
- **Backend Layer:** Node.js running an Express.js server on Port 5000 utilizing 11 core controllers and routes.
- **Data Layer:** A robust MySQL relational database containing tables for users, plans, applications, assessments, notifications, and feedback.
- **Security Protocols:** JWT-based stateless authentication, bcrypt password hashing, express-rate-limit to stop brute-forcing, and Google OAuth 2.0.

---

## 2. In-Depth User Roles & Permissions

The platform strictly separates capabilities into three tiers.

### 2.1 Individual Users (Customers)
Individual users are the primary consumers on the platform. Any member of the public can register for an Individual account.
- **Account Registration:** Individuals can register via a standard email/password process or use single-click Google OAuth 2.0 functionality.
- **The Profile Engine:** Upon logging in, individuals must first complete their user profile. This involves submitting their basic details, which forms the seed data for their eventual risk calculation.
- **Risk Assessment Module:** This is the most critical feature. The user takes a dynamic questionnaire fetched from the database. The system analyzes their Age & Health, Financial Resilience, Insurance Gaps, and Lifestyle Risks to categorize them.
- **Browse marketplace:** Users can access the "Browse Plans" page, which leverages the Plan Matching Algorithm to rank policies.
- **Application Pipeline:** When a user likes a plan, they click 'Apply'. This sends their entire profile and risk breakdown to the specific Insurance Provider who listed the plan. Users can view their application statuses in real-time.
- **Report Generation:** Users can click a button to download a dynamically generated PDF report of their risk breakdown.

### 2.2 Insurance Providers
Insurance providers are verified corporate entities looking to sell policies. Individual users **cannot** register as providers. Provider accounts must be manually created by an Administrator.
- **Creating Insurance Plans:** Providers have access to a specific dashboard where they can define a new insurance plan (e.g., Medical, Life, Personal Accident). They set the premium costs, coverage limits, and target risk levels.
- **Plan Verification:** When a Provider clicks "Submit New Plan", the plan is placed in a "Pending" state. It will **not** be visible to Individual users on the marketplace until an Admin reviews and approves it.
- **Underwriting Applicant Flow:** Providers continuously monitor their "Application Queue". When an Individual applies for a plan, the Provider receives their application. The Provider can review the user's computed Risk Score and decide to either **Approve** or **Reject** the application.
- **Provider Analytics:** Providers have a private analytics view showing a Bar Chart of their application pipeline and a Doughnut Chart detailing their historical approval vs rejection rate.

### 2.3 Administrators (Super Users)
Admins control the entire InsureIQ ecosystem.
- **User Auditing:** Admins have a global view of every user. They can click "Toggle Status" to suspend an abusive user or activate a pending user. They can permanently delete accounts.
- **Provider Provisioning:** Admins execute an endpoint to create a fresh Provider account and assign credentials to partner companies.
- **Marketplace Moderation:** Admins review all newly submitted plans from Providers. If a plan is valid, they mark it as "Approved", immediately injecting it into the public marketplace algorithm.
- **Dynamic Scoring Engine Configuration:** The Risk Engine is not hardcoded. Admins have a dedicated UI allowing them to add/remove assessment questions. They can change the mathematical weight (points) assigned to specific answers (e.g., changing the penalty for being a smoker from 20 points to 30 points).
- **Macro Analytics:** Admins see platform-wide data, including global user growth, the total distribution of active plans, and user satisfaction feedback.

---

## 3. Deep-Dive into Core Algorithms

### 3.1 The Risk Assessment Engine
The Risk Assessment Engine calculates a numerical score based on the user's answers to the dynamic questionnaire.

**The Four Categories of Risk:**
1. **Age & Health Risks:** Analyzes biological age brackets, smoking habits, and general health condition. (e.g., A smoker incurs a heavy penalty).
2. **Financial Resilience:** Analyzes Debt-to-Income (DTI) ratio, employment status, income brackets, and cash savings. (e.g., Savings under RM5,000 adds significant financial risk points).
3. **Insurance Gaps:** Analyzes existing coverage like Life Insurance, Medical Insurance, and Critical Illness coverage.
4. **Lifestyle Risks:** Analyzes occupation (Desk job vs High-Risk Manual Labor), international travel frequency, and family medical history.

**Risk Classifications:**
Once points are tallied from all four categories against the maximum available score, the user is grouped into a Risk Threshold.
- LOW RISK
- MEDIUM RISK (Starts dynamically, usually around score 91)
- HIGH RISK (Starts dynamically, usually around score 181)

### 3.2 The 8-Point Plan Matching Algorithm
The marketplace does not show static lists. It executes an 8-point personalized scan for every Individual user:
1. **Age Eligibility:** Does the user fall within the plan's minimum and maximum age criteria?
2. **Coverage Adequacy:** Is the payout amount sufficient to cover the user's calculated financial liability?
3. **Premium Affordability:** Can the user afford the monthly premium based on their submitted Income bracket and Debt-to-Income ratio?
4. **Risk-Type Relevance:** If the user scored highly in "Lifestyle Risks", are Personal Accident plans prioritized at the top of the list?
5. **Deduplication:** Hides plans the user has already been approved for.
6. **Provider Rating:** Factors in historical feedback for the specific provider.
7. **Ranking & Reason:** Each plan generates a specific "Match Reason" (e.g., "Highly recommended because you lack medical coverage and this plan fits your income bracket.")

---

## 4. Frequently Asked Questions (FAQ)

**Q: How does a user submit a claim?**
A: To submit a claim, the Individual user must log into their dashboard and navigate to the claims section. They must select an approved, active policy, enter the incident date, provide a description, input the claimed amount, and optionally upload evidence. The claim is then sent to the Provider for settlement processing.

**Q: Can a Provider instantly publish a new plan?**
A: No. All newly created plans default to a 'pending' status. An Admin must review and approve the plan before it is injected into the public matching algorithm.

**Q: I forgot my password, how do I recover my account?**
A: InsureIQ uses a token-based reset system. A user clicks "Forgot Password", which sends a secure 64-character token to their email. They click the link, input a new password, and the system hashes the new password with bcrypt before securely saving it to the database.

**Q: Are my assessment scores permanent?**
A: No. InsureIQ keeps an "Assessment History". Users can retake the assessment if their life circumstances change (e.g., they get a new job or buy health insurance). The algorithm will always use their *latest* assessment.

**Q: How do Admins change how many points a question is worth?**
A: Admins can log into the Admin Dashboard, navigate to the "Scoring Config" tab, and directly edit the `scoring_weights` records in the database. These changes affect all future assessments instantly.

---

## 5. Platform Navigation Guide — Individual Users

This section explains every page and button available to Individual users.

### How to Register
Go to the InsureIQ landing page and click the "Get Started" or "Register" button. You can sign up using your email address and a password, or click "Continue with Google" to register instantly with your Google account. After registering, you will be directed to your dashboard.

### How to Log In
Visit the InsureIQ login page. Enter your registered email and password, then click "Login". Alternatively, click "Continue with Google" to sign in with your Google account. If you forgot your password, click "Forgot Password" on the login page.

### How to Reset Your Password
On the login page, click "Forgot Password". Enter your registered email address. InsureIQ will send a password reset link to your email. Click the link in the email, enter your new password, and confirm it. Your password will be updated and you can log in with the new one.

### How to Set Up Your Profile
After registering, you will be prompted to complete your profile. Click "Complete Profile" or navigate to the Profile section. Fill in your personal details such as your name, date of birth, gender, occupation, income range, and other relevant information. This profile data is used as the foundation for your risk assessment calculation. You must complete your profile before taking the risk assessment.

### How to Take the Risk Assessment
From your Individual Dashboard, click the "Start Risk Assessment" or "Risk Assessment" button. You will be presented with a dynamic questionnaire covering four areas: Age & Health, Financial Resilience, Insurance Gaps, and Lifestyle Risks. Answer all the questions honestly and click "Submit" when done. The system will instantly calculate your risk score and redirect you to your Results page.

### What is the Risk Assessment Results Page
After completing the assessment, you are taken to the Results page. This page shows your total risk score, your risk level (Low, Medium, or High), and a breakdown of your score across the four risk categories. It also shows personalised insurance recommendations based on your profile. You can download a PDF report of your results from this page by clicking "Download Report".

### What is the Risk Matrix
The Risk Matrix is a visual chart on your dashboard that shows where your risk score sits relative to the Low, Medium, and High risk thresholds. It gives you a quick visual understanding of your overall risk profile compared to the scoring boundaries.

### What is Assessment History
The "Assessment History" button or page shows a full list of every risk assessment you have ever completed on the platform, ordered from newest to oldest. Each entry shows the date, your total score, and your risk level at that time. You can click on any past assessment to view the full breakdown. This is useful if you want to track how your risk profile has changed over time — for example, after buying a new insurance plan or changing jobs. The platform always uses your most recent assessment when matching plans.

### How to Browse Insurance Plans
Click "Browse Plans" from your dashboard. The platform automatically filters and ranks all approved insurance plans based on your risk profile, age, income, and coverage gaps. Each plan shows the plan name, provider, type of insurance, monthly premium, coverage amount, and a personalised match reason explaining why this plan is recommended for you. Click "Apply" on any plan you want to apply for.

### How to Apply for a Plan
On the Browse Plans page, find a plan you want and click "Apply". Confirm your application in the dialog box. Your application is immediately sent to the Insurance Provider for review. You will receive an in-app notification and email when the provider makes a decision.

### What is My Applications
The "My Applications" page shows every insurance plan you have applied for, along with the current status of each application: Pending (waiting for provider review), Approved (provider accepted your application), or Rejected (provider declined). You can also withdraw a pending application by clicking "Withdraw" if you change your mind.

### How to File a Claim
Navigate to "My Claims" from your dashboard and click "File a Claim". You must have at least one approved application to file a claim. Select which approved policy the claim is for, choose the claim type (Medical, Accident, Critical Illness, Disability, Death, Property, or Other), enter the incident date, write a description of what happened, enter the amount you are claiming, and upload any supporting documents such as medical bills or reports (PDF, JPG, or PNG files, up to 5 files, maximum 5MB each). Click "Submit Claim". The provider will be notified immediately.

### What is My Claims
The "My Claims" page shows all the claims you have submitted. Each claim shows the policy it is linked to, the claim type, the amount claimed, the incident date, and the current status: Under Review (pending), Approved (with the settlement amount shown), or Rejected. You will receive an in-app notification and email when the provider processes your claim.

### What are Notifications
The bell icon in the top navigation bar shows your in-app notifications. A red badge number indicates how many unread notifications you have. Click the bell to open the notification dropdown, which shows your last 20 notifications with a timestamp. Click any notification to mark it as read. Click "Mark all read" to clear all unread notifications. Notifications are sent for key events such as application approvals, claim decisions, and plan status updates.

### How to Give Feedback
After completing a risk assessment, you can leave a star rating (1 to 5 stars) and an optional comment about your experience. This feedback helps improve the platform and is reviewed by administrators.

---

## 6. Platform Navigation Guide — Insurance Providers

This section explains every page and button available to Provider users.

### How to Get a Provider Account
Individual users cannot self-register as providers. A Provider account must be created by an InsureIQ Administrator. The admin creates the account and provides the login credentials to the insurance company. Providers log in through the same login page as individual users.

### Provider Dashboard
After logging in, providers land on the Provider Dashboard. This shows key statistics including: total applications received, number of pending applications awaiting review, number of approved applications, average risk score of all applicants, and an applicant satisfaction rating. Two charts are displayed — an Application Pipeline doughnut chart and a Plans by Status bar chart.

### How to Add a New Insurance Plan
From the Provider Dashboard, click "Add Plan" or navigate to the "Add Plan" page from the sidebar. Fill in the plan details: plan name, insurance type (Medical, Life, Personal Accident, Critical Illness, etc.), description, monthly premium amount, coverage amount, minimum and maximum age eligibility, and the target risk level. Click "Submit Plan". The plan will be set to "Pending" status and sent to the Admin for approval before it appears in the marketplace.

### What is My Plans
The "My Plans" page shows all insurance plans created by the provider. Each plan displays its name, type, premium, coverage, status (Pending, Approved, or Rejected), and creation date. Click "Edit" on any plan to modify its details. Only approved plans are visible to individual users on the marketplace.

### How to Edit a Plan
On the "My Plans" page, click the "Edit" button next to a plan. Make your changes to the plan details and click "Save". Note that editing an approved plan may require re-approval by an Admin depending on the changes made.

### How to Review Applications
Click "Applications" or "Application Queue" from the sidebar. This page shows all applications submitted by individual users for the provider's plans. Each application shows the applicant's name, the plan they applied for, their risk score, risk level, and the date of application. Click on an application to expand it and see the full risk breakdown. Then click "Approve" or "Reject" to process the application. The applicant will be notified immediately by email and in-app notification.

### How to Review and Process Claims
Click "Claims" from the sidebar to access the Provider Claims page. This shows all claims filed against the provider's plans, filterable by status (Pending, Approved, Rejected). Click on a claim to see the full details: applicant name, plan name, claim type, incident date, description, claimed amount, and any uploaded documents. To approve a claim, enter a settlement amount (must be equal to or less than the policy coverage) and click "Approve". To reject a claim, optionally add a note and click "Reject". The individual user will be notified immediately.

### Provider Analytics
The Provider Analytics section shows metrics specific to the provider's business: total plans, total applications, application approval and rejection rates, and the average risk score of all applicants. This helps providers understand their customer risk distribution.

---

## 7. Platform Navigation Guide — Administrators

This section explains every page and button available to Admin users.

### Admin Dashboard
The Admin Dashboard shows platform-wide metrics: total users broken down by role (Individuals, Providers, Admins), insurance plans by status, risk distribution across all users (Low, Medium, High), application pipeline totals, and user feedback summary. Charts display this data visually for quick analysis.

### How to Manage Users
Click "User Management" in the Admin sidebar. This page lists every registered user on the platform with their name, email, role, and account status. Admins can:
- **Toggle Status**: Click "Toggle Status" to suspend an active user or reactivate a suspended user.
- **Delete Account**: Click "Delete" to permanently remove a user and all their data.
- **Create Provider**: Click "Create Provider" to register a new insurance provider account. Fill in the provider's name, email, and password.

### How to Approve or Reject Plans
Click "Plan Approval" in the Admin sidebar. This shows all plans currently in "Pending" status submitted by providers. Click on a plan to review its details, then click "Approve" to publish it to the marketplace or "Reject" to decline it. The provider is notified of the decision by email and in-app notification.

### How to View All Assessments
Click "Assessments" in the Admin sidebar. This page lists every risk assessment completed by every user on the platform, showing the user's name, score, risk level, and assessment date. Admins can delete assessments if needed.

### How to View All Applications
Click "Applications" in the Admin sidebar. This shows every insurance application submitted across the entire platform, including the applicant name, plan name, provider name, status, and date.

### How to View All Claims
Click "Claims" in the Admin sidebar. This shows every claim submitted across the entire platform with all details including status and settlement amounts.

### How to View Feedback
Click "Feedback" in the Admin sidebar. This shows all star ratings and comments submitted by individual users after completing their assessments. The page shows the overall average rating and the total number of feedback entries.

### How to Configure the Scoring Engine
Click "Scoring Config" in the Admin sidebar. This is a powerful page that lets admins:
- **Add new assessment questions**: Click "Add Question" and fill in the question text, type, and available answer options.
- **Edit existing questions**: Click "Edit" on any question to modify its text or answers.
- **Delete questions**: Remove questions that are no longer relevant.
- **Reorder questions**: Drag questions to change the order they appear in the assessment.
- **Change point weights**: Edit the numerical score penalty assigned to each answer option (e.g., increase the smoker penalty from 20 to 30 points). Changes take effect immediately for all future assessments.

### How to Manage the AI Knowledge Base
Click "Knowledge Base" in the Admin sidebar. This page lets admins manage the documents that power the InsureIQ AI chatbot. Admins can:
- **Upload a new document**: Paste or type markdown content and click "Upload". The system automatically chunks the document, generates embeddings, and stores it for retrieval.
- **View existing documents**: See all uploaded documents with their chunk counts.
- **Update a document**: Click "Edit" to modify a document's content and re-embed it.
- **Delete a document**: Remove a document from the knowledge base entirely.

### How to Export Data
Click the "Export" button on the Admin Dashboard. Admins can download CSV files for: Users, Assessments, Applications, and Feedback. The CSV files download directly to the admin's computer.

---

## 8. Claims — Complete Lifecycle

### Step 1: Individual Files a Claim
The individual user navigates to "My Claims" and clicks "File a Claim". They must have at least one approved application. They cannot file a second active claim for the same approved policy. They fill in the claim form with the incident date, description, type of claim, and the amount they are claiming. They can attach up to 5 supporting documents. The claim is submitted with a status of "Under Review".

### Step 2: Provider is Notified
The insurance provider receives an in-app notification and an email alerting them that a new claim has been filed against one of their plans. The notification contains the claimant's name and the plan name.

### Step 3: Provider Reviews the Claim
The provider goes to their Claims page and clicks on the claim. They can read the full description, view the incident date, see the applicant's risk score and risk level, and download any uploaded documents.

### Step 4: Provider Makes a Decision
- **To Approve**: The provider enters a settlement amount (must not exceed the policy's coverage limit) and clicks "Approve". The system records the settlement amount.
- **To Reject**: The provider can optionally add a reason or notes and clicks "Reject".

### Step 5: Individual is Notified
The individual receives an in-app notification and an email about the claim decision. If approved, the email shows the settlement amount they will receive. If rejected, any notes from the provider are included.

### Step 6: Claim is Closed
The claim status is updated to "Approved" or "Rejected" and the record is permanently stored. The admin can view all claims across the platform at any time.

---

## 9. Notifications System

InsureIQ has two types of notifications: in-app notifications and email notifications.

### In-App Notifications
The bell icon in the top navigation bar shows a badge with the count of unread notifications. Clicking the bell opens a dropdown list of the last 20 notifications. Each notification shows a title, a short message, and a relative timestamp (e.g., "5 minutes ago"). Unread notifications are highlighted in blue. Click a notification to mark it as read. Click "Mark all read" to mark all notifications as read at once. Notifications refresh automatically every 30 seconds.

### Email Notifications
InsureIQ sends automatic emails for the following events:
- When an Individual applies for a plan (email sent to the Provider)
- When a Provider approves or rejects an application (email sent to the Individual)
- When an Individual files a claim (email sent to the Provider)
- When a Provider approves or rejects a claim (email sent to the Individual, with settlement amount if approved)
- When an Admin approves or rejects a Provider's plan (email sent to the Provider)

---

## 10. Account & Security

### Changing Your Password
After logging in, navigate to your account settings and click "Change Password". Enter your current password, then enter and confirm your new password. Click "Save". Your new password must meet the platform's minimum security requirements.

### Google OAuth Login
Users who registered with Google do not have a platform password. They must always log in using "Continue with Google". They cannot use the "Forgot Password" feature because their account is managed by Google.

### JWT Authentication
InsureIQ uses JSON Web Tokens (JWT) for session management. When you log in, a token is issued and stored in your browser. This token is attached to every request you make. Tokens expire after a set period, at which point you will be automatically logged out and prompted to log in again.

### Account Suspension
If an Admin suspends your account, you will be unable to log in. Contact the InsureIQ support team to have your account reviewed and reactivated.

---

## 11. Insurance Types Available on InsureIQ

InsureIQ supports the following types of insurance plans that providers can list on the marketplace:

- **Medical Insurance**: Covers hospitalisation, surgery, and medical treatment costs.
- **Life Insurance**: Pays a lump sum to beneficiaries upon the policyholder's death.
- **Personal Accident Insurance**: Covers injuries, disability, or death caused by accidents.
- **Critical Illness Insurance**: Pays a lump sum upon diagnosis of a covered critical illness such as cancer, heart attack, or stroke.
- **Disability Insurance**: Replaces income if the policyholder becomes unable to work due to illness or injury.
- **Property Insurance**: Covers damage or loss to property.

### What is a Premium
A premium is the amount of money you pay to the insurance provider, usually monthly, in exchange for insurance coverage. For example, if a plan has a monthly premium of RM150, you pay RM150 every month to keep the policy active.

### What is Coverage / Sum Insured
Coverage (also called Sum Insured) is the maximum amount the insurance company will pay out if you make a successful claim. For example, a plan with RM100,000 coverage will pay out a maximum of RM100,000 for a valid claim.

### What is a Claim
A claim is a formal request made by the insured individual to the insurance provider to receive a payout or reimbursement after an insured event occurs (e.g., hospitalisation, accident, or diagnosis of a critical illness).

### What is a Risk Score
Your risk score is a numerical value calculated by the InsureIQ Risk Assessment Engine based on your age, health, finances, existing insurance, and lifestyle. A higher score means higher risk. Insurance providers use your risk score when deciding whether to approve or reject your application for a plan.

### What is Debt-to-Income Ratio (DTI)
DTI is the percentage of your monthly income that goes towards paying debts. A high DTI (e.g., over 60%) means most of your income is already committed to debt repayment, which increases your financial risk score on InsureIQ.

---

## 12. AI Chatbot — InsureIQ Assistant

The InsureIQ AI Assistant is the chat widget available on the bottom right of your screen. You can ask it any question about InsureIQ, insurance, risk assessments, claims, plans, or platform navigation.

### What the chatbot can help with
- Explaining your risk score and what it means
- Guiding you on how to use any feature on the platform
- Answering general insurance questions (premiums, coverage, claims, policy types)
- Explaining what documents you need to file a claim
- Telling you the difference between plan types
- Helping you understand your assessment results

### What the chatbot cannot help with
The chatbot is limited to InsureIQ and insurance-related topics. It cannot answer questions about weather, cooking, politics, programming, or other unrelated topics.

### Languages
The chatbot understands English and Malay (including Manglish and common Malaysian slang). You can ask your question in either language and it will respond in English.
