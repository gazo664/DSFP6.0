# JobTrack - Job Tracking & Recruitment Application

> A modern, full-stack Job Board and Applicant Tracking System (ATS) designed with a crisp **Light Blue** color aesthetic.
> Allows **Admins / Recruiters** to post job openings and manage candidate hiring pipelines, and **Normal Users / Candidates** to browse, filter, apply with resume attachments, and track their application progress in real-time.

---

## ✨ Features

### 👤 For Candidates / Normal Users
- **Browse Open Jobs**: Responsive card feed displaying job positions, department pills, location tags, salary ranges, and relative posted timestamps.
- **Search & Multi-Filters**: Instant keyword search (job title, skill, description), filter by department, filter by job type (Full-time, Remote, Hybrid, Contract), and popular quick-filter chips.
- **Detailed Job Overviews**: Full role breakdown with responsibilities, requirements, benefits, and compensation details.
- **Quick & Easy Application**:
  - Full candidate contact information (Name, Email, Phone).
  - Professional portfolio and LinkedIn links.
  - Skills tags and experience level.
  - Custom cover letter.
  - **Resume Upload**: Drag-and-drop resume attachment support (PDF, DOCX, TXT) with live file preview.
- **"My Applications" Status Tracker**:
  - Step-by-step visual hiring pipeline (`Applied` ➔ `Screening` ➔ `Interview` ➔ `Offer` ➔ `Hired` / `Rejected`).
  - Read internal notes & updates directly from the hiring team.
  - View submitted resume attachments.
  - Guest application tracking by email or via logged-in user profile.

### 🛡️ For Admins / Recruiters
- **KPI Dashboard**:
  - Total Jobs, Active Openings, Total Candidates, Interviews/Screening in progress, and Hired count.
  - Recent candidate submissions feed with 1-click review action.
- **Job Openings Management**:
  - **Post New Job Openings**: Full editor for title, department, location, job type, experience level, salary range, description, requirements, benefits, and status.
  - **1-Click Pre-fill Templates**: Quickly generate realistic job openings (Frontend Engineer, Backend Engineer, UI/UX Designer, DevOps Specialist).
  - **Edit & Status Toggle**: Switch openings between `Active / Open` and `Closed / Paused` with one click.
  - **Candidate Counter**: See exact applicant counts for each opening and jump directly to that opening's candidate list.
  - **Delete Openings**: Clean deletion with cascading application removal.
- **Candidate Hiring Pipeline / Tracker**:
  - Visual stages: `Applied`, `Screening`, `Interview Scheduled`, `Offer Extended`, `Hired`.
  - Filter applicants by specific job opening or search by name, email, or skill.
  - **Interactive Candidate Review Modal**:
    - Complete applicant profile, links, and cover letter.
    - View and download uploaded resume files.
    - Update candidate status with real-time feedback.
    - Set 1-5 Star Candidate Score.
    - Save internal recruiter notes.
  - **Export to CSV**: 1-click export of candidate data for spreadsheets and hiring team reviews.
- **1-Click Demo Reset**: Reset database back to clean, rich demo state at any time.

---

## 🎨 Design System: Light Blue Theme
- **Primary Palette**: Sky & Light Blue tones (`#0284c7`, `#0ea5e9`, `#38bdf8`, `#7dd3fc`, `#e0f2fe`, `#f0f9ff`).
- **High-Contrast Readability**: Dark slate text (`#0f172a`, `#334155`) for accessibility compliance.
- **Interactive UI**: Soft rounded cards (`border border-sky-100 bg-white shadow-sm`), pill badges, glowing focus rings, responsive mobile/desktop layout.
- **Instant Role Switcher**: Quick toggle pill in the header allowing users to effortlessly preview both the Candidate and Admin experiences.

---

## 🚀 Quick Start

### Option 1: Double-Click Launcher (Windows)
Double-click `start.bat` or run `start.ps1`. It will auto-detect Python and open `http://localhost:8000` in your browser.

### Option 2: Command Line (PowerShell / Command Prompt)
Run with Python:
```powershell
python app.py
```
*(Or if using the installed QGIS Python runtime:)*
```powershell
& "C:\Program Files\QGIS 3.44.0\apps\Python312\python.exe" app.py
```

Then visit in your web browser:
👉 **`http://127.0.0.1:8000`**

---

## 🔑 Demo Accounts

Use the 1-click demo buttons in the login modal, or sign in manually:

| Role | Email | Password |
|---|---|---|
| **Admin / Recruiter** | `admin@jobtrack.io` | `admin123` |
| **Candidate / Job Seeker** | `candidate@example.com` | `candidate123` |

*(Candidates can also register a new account or apply as guest candidates anytime!)*

---

## 📂 Project Structure

```
SMS/
├── app.py              # REST API server & static file host (Python 3)
├── database.py         # SQLite schema, queries, migration & seed data
├── start.bat           # Windows 1-click launch batch script
├── start.ps1           # Windows PowerShell launch script
├── README.md           # Documentation and guides
└── static/
    ├── index.html      # Single Page Application HTML shell
    ├── css/
    │   └── style.css   # Light blue theme, layout, components & animations
    ├── js/
    │   └── app.js      # Frontend controller, API client & reactive views
    └── uploads/        # Candidate uploaded resumes & sample files
```

---

## 📡 REST API Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Sign in with email and password |
| `POST` | `/api/auth/register` | Create a candidate account |
| `GET` | `/api/auth/me` | Fetch active session profile |
| `POST` | `/api/auth/logout` | Terminate session |
| `GET` | `/api/jobs` | Get job openings (supports search, department, type) |
| `GET` | `/api/jobs/<id>` | Get specific job opening details |
| `POST` | `/api/jobs` | Create a new job opening (Admin only) |
| `PUT` | `/api/jobs/<id>` | Update job opening (Admin only) |
| `PATCH`| `/api/jobs/<id>/status` | Toggle open/closed status (Admin only) |
| `DELETE`| `/api/jobs/<id>` | Delete job opening (Admin only) |
| `POST` | `/api/applications` | Submit job application with resume file |
| `GET` | `/api/applications` | List applications (Admin: all, Candidate: user-specific) |
| `GET` | `/api/applications/<id>` | Application details |
| `PATCH`| `/api/applications/<id>/status`| Update candidate status (Admin only) |
| `PATCH`| `/api/applications/<id>/review`| Save rating and recruiter notes (Admin only) |
| `GET` | `/api/admin/stats` | KPI statistics for admin dashboard |
| `POST` | `/api/seed/reset` | Reset demo data to initial state |

