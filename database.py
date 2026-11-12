"""
Database layer for JobTrack Application.
Handles SQLite connection, schema initialization, seed data, and CRUD operations.
"""
import os
import sys

# Enable DLL loading for SQLite on Windows environments BEFORE importing sqlite3
try:
    if os.path.exists(r"C:\Program Files\QGIS 3.44.0\bin"):
        os.add_dll_directory(r"C:\Program Files\QGIS 3.44.0\bin")
except Exception:
    pass

import sqlite3
import hashlib
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "jobs.db")

def hash_password(password: str) -> str:
    """Hash a password using SHA-256 with salt."""
    salt = "jobtrack_light_blue_salt_"
    return hashlib.sha256((salt + password).encode('utf-8')).hexdigest()

def get_connection():
    """Get a database connection with row factory configured."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    """Initialize database tables."""
    conn = get_connection()
    cursor = conn.cursor()

    # Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user', -- 'admin' or 'user'
        phone TEXT,
        created_at TEXT NOT NULL
    )
    """)

    # Jobs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        department TEXT NOT NULL,
        location TEXT NOT NULL,
        job_type TEXT NOT NULL, -- 'Full-time', 'Part-time', 'Remote', 'Hybrid', 'Contract'
        experience_level TEXT NOT NULL, -- 'Entry Level', 'Mid Level', 'Senior Level', 'Lead / Staff'
        salary_range TEXT,
        description TEXT NOT NULL,
        requirements TEXT,
        benefits TEXT,
        status TEXT NOT NULL DEFAULT 'open', -- 'open', 'closed'
        created_by INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )
    """)

    # Applications table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER NOT NULL,
        user_id INTEGER,
        applicant_name TEXT NOT NULL,
        applicant_email TEXT NOT NULL,
        applicant_phone TEXT,
        portfolio_url TEXT,
        linkedin_url TEXT,
        resume_filename TEXT,
        resume_filepath TEXT,
        cover_letter TEXT,
        skills TEXT,
        experience_years TEXT,
        status TEXT NOT NULL DEFAULT 'applied', -- 'applied', 'screening', 'interview', 'offer', 'hired', 'rejected'
        admin_notes TEXT,
        rating INTEGER DEFAULT 0, -- 0 to 5
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
    """)

    # Saved jobs bookmark table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS saved_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        job_id INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(user_id, job_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    )
    """)

    conn.commit()
    conn.close()

def seed_db():
    """Populate default demo users, jobs and sample applications if empty."""
    conn = get_connection()
    cursor = conn.cursor()

    # Check if users exist
    cursor.execute("SELECT COUNT(*) as count FROM users")
    if cursor.fetchone()['count'] == 0:
        now = datetime.now().isoformat()
        
        # 1. Create Default Admin & Candidate Users
        admin_pwd = hash_password("admin123")
        user_pwd = hash_password("candidate123")

        cursor.execute("""
        INSERT INTO users (email, password_hash, full_name, role, phone, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """, ("admin@jobtrack.io", admin_pwd, "Sarah Jenkins (HR Director)", "admin", "+1 (555) 019-2834", now))
        admin_id = cursor.lastrowid

        cursor.execute("""
        INSERT INTO users (email, password_hash, full_name, role, phone, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """, ("candidate@example.com", user_pwd, "Michael Chang", "user", "+1 (555) 782-9901", now))
        candidate_id = cursor.lastrowid

        # 2. Seed Jobs
        sample_jobs = [
            (
                "Senior Frontend Engineer",
                "Engineering",
                "Remote (US / Europe)",
                "Full-time",
                "Senior Level",
                "$130,000 - $160,000",
                "We are seeking an experienced Senior Frontend Engineer to lead the development of our next-generation web application. You will architect intuitive UI interfaces, optimize render performance, and build responsive frontend workflows.",
                "• 5+ years building modern web applications with React, TypeScript, and modern CSS.\n• Strong foundation in state management, component architecture, and accessibility (a11y).\n• Experience with RESTful and GraphQL APIs.\n• Track record of mentoring junior engineers and conducting insightful code reviews.",
                "• Comprehensive health, dental, and vision insurance\n• 401(k) matching up to 5%\n• Flexible remote work & $1,500 home office stipend\n• Unlimited PTO and annual wellness budget",
                "open",
                admin_id,
                now,
                now
            ),
            (
                "Lead Product Designer (UI/UX)",
                "Design",
                "Hybrid (New York, NY)",
                "Full-time",
                "Lead / Staff",
                "$140,000 - $175,000",
                "Join our core product team as Lead Product Designer. You will spearhead design systems, conduct customer discovery interviews, produce wireframes & interactive prototypes, and collaborate closely with product managers and engineers.",
                "• 6+ years designing consumer-facing or B2B SaaS web applications.\n• Mastery of Figma, auto-layout, design tokens, and design system governance.\n• Deep empathy for end-users, proven through user research and usability testing.\n• Strong portfolio demonstrating end-to-end product thinking.",
                "• Competitive equity package\n• Top-tier medical, vision, and mental wellness coverage\n• Commuter benefits and catered lunches on office days\n• Annual conference & learning allowance ($2,500)",
                "open",
                admin_id,
                now,
                now
            ),
            (
                "DevOps & Cloud Infrastructure Specialist",
                "Infrastructure",
                "Remote",
                "Full-time",
                "Mid Level",
                "$115,000 - $145,000",
                "We are looking for a DevOps Specialist to automate our deployment pipelines, maintain high-availability Kubernetes clusters, and champion security best practices across AWS infrastructure.",
                "• 3+ years experience with AWS, Terraform/CloudFormation, and Docker.\n• Hands-on expertise with CI/CD tools (GitHub Actions, GitLab CI).\n• Experience setting up observability and alert monitoring with Prometheus & Grafana.\n• Strong scripting skills in Python or Bash.",
                "• 100% remote work flexibility\n• Premium health & wellness coverage\n• Flexible working hours and async-first culture\n• Annual technology refresh allowance",
                "open",
                admin_id,
                now,
                now
            ),
            (
                "Product Marketing Manager",
                "Marketing",
                "San Francisco, CA",
                "Full-time",
                "Mid Level",
                "$100,000 - $130,000",
                "Drive go-to-market strategies, product launches, messaging, and competitive positioning for our fast-growing SaaS platform. You'll partner with sales, marketing, and product leadership.",
                "• 3-5 years experience in B2B SaaS product marketing.\n• Exceptional storytelling, copywriting, and presentation abilities.\n• Data-driven mindset with experience tracking acquisition funnels and product KPIs.\n• Experience launching multi-channel campaigns.",
                "• Health, dental, and vision coverage\n• Equity stock options\n• Hybrid schedule (2 days in office, 3 days remote)\n• Generous parental leave",
                "open",
                admin_id,
                now,
                now
            ),
            (
                "Junior Full Stack Developer",
                "Engineering",
                "Austin, TX",
                "Full-time",
                "Entry Level",
                "$75,000 - $92,000",
                "An exciting opportunity for a motivated developer to work across our web stack. You will develop API endpoints, build UI components, write automated tests, and learn from experienced engineers.",
                "• Degree in Computer Science or equivalent hands-on project experience.\n• Familiarity with JavaScript/TypeScript, Python, and SQL databases.\n• Passion for writing clean, readable, well-tested code.\n• Eager to learn, collaborate, and adapt in an agile environment.",
                "• Dedicated senior engineer mentorship program\n• Full health coverage\n• Paid study time and certification sponsorships\n• Vibrant team culture with team offsites",
                "open",
                admin_id,
                now,
                now
            ),
            (
                "Data Analyst & Business Intelligence Specialist",
                "Analytics",
                "Remote",
                "Contract",
                "Mid Level",
                "$50 - $75 / hr ($90,000 - $115,000 equiv.)",
                "Help us unlock insights from user engagement metrics, sales pipelines, and product analytics. Build interactive dashboards in Tableau/PowerBI and write SQL pipelines.",
                "• 3+ years writing complex SQL queries and analyzing relational datasets.\n• Proficiency in data visualization tools (Tableau, PowerBI, Metabase).\n• Working knowledge of Python (pandas, numpy) for exploratory data analysis.\n• Ability to translate raw metrics into strategic business recommendations.",
                "• Flexible contract duration (6-12 months with potential for full-time conversion)\n• Remote work from anywhere\n• Project milestone bonuses",
                "open",
                admin_id,
                now,
                now
            )
        ]

        cursor.executemany("""
        INSERT INTO jobs (
            title, department, location, job_type, experience_level,
            salary_range, description, requirements, benefits,
            status, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, sample_jobs)

        # 3. Seed Sample Applications
        cursor.execute("SELECT id FROM jobs WHERE title LIKE 'Senior Frontend%'")
        job1 = cursor.fetchone()
        job1_id = job1['id'] if job1 else 1

        cursor.execute("SELECT id FROM jobs WHERE title LIKE 'Lead Product Designer%'")
        job2 = cursor.fetchone()
        job2_id = job2['id'] if job2 else 2

        cursor.execute("SELECT id FROM jobs WHERE title LIKE 'DevOps%'")
        job3 = cursor.fetchone()
        job3_id = job3['id'] if job3 else 3

        sample_apps = [
            (
                job1_id,
                candidate_id,
                "Michael Chang",
                "candidate@example.com",
                "+1 (555) 782-9901",
                "https://michaelchang.dev",
                "https://linkedin.com/in/michaelchang",
                "Michael_Chang_Resume.pdf",
                "uploads/sample_resume_michael.pdf",
                "I have been building high-performance web applications for over 6 years with React and TypeScript. I am particularly drawn to your product vision and light-blue modern UI ethos. I look forward to contributing my experience in component architecture and frontend performance optimization.",
                "React, TypeScript, Next.js, Redux, TailwindCSS, Jest, Webpack",
                "6 years",
                "interview",
                "Strong portfolio and impressive technical test. Technical round scheduled for Thursday at 2:00 PM.",
                5,
                now,
                now
            ),
            (
                job1_id,
                None,
                "Elena Rostova",
                "elena.rostova@techmail.io",
                "+1 (555) 432-8819",
                "https://github.com/erostova",
                "https://linkedin.com/in/elenarostova",
                "Elena_Rostova_CV.pdf",
                "uploads/sample_resume_elena.pdf",
                "Experienced frontend developer with a passion for accessible design systems and micro-frontends. Eager to bring my expertise to your growing engineering team.",
                "JavaScript, Vue.js, React, CSS3/Sass, Accessibility (WCAG 2.1)",
                "4 years",
                "screening",
                "Initial resume review looks promising. Follow up regarding salary expectations.",
                4,
                now,
                now
            ),
            (
                job2_id,
                None,
                "Jessica Vance",
                "jessica.vance@designstudio.org",
                "+1 (555) 304-1182",
                "https://jessicavance.design",
                "https://linkedin.com/in/jessicavance-ui",
                "Jessica_Vance_Portfolio.pdf",
                "uploads/sample_resume_jessica.pdf",
                "Product designer with 7 years of experience crafting seamless digital products for FinTech and SaaS. I love building design tokens and Figma component libraries.",
                "Figma, Design Systems, UX Research, Prototyping, Wireframing, HTML/CSS",
                "7 years",
                "offer",
                "Outstanding design presentation! Team unanimously voted to extend offer. Offer letter sent.",
                5,
                now,
                now
            ),
            (
                job3_id,
                None,
                "Marcus Aurelius Rivera",
                "marcus.rivera@cloudsys.net",
                "+1 (555) 912-4433",
                "https://github.com/mrivera-infra",
                "https://linkedin.com/in/marcusrivera-devops",
                "Marcus_Rivera_Resume.pdf",
                "uploads/sample_resume_marcus.pdf",
                "Infrastructure engineer passionate about Kubernetes, GitOps, and reliable automated deployments. Built scalable CI/CD pipelines handling hundreds of daily builds.",
                "Kubernetes, AWS, Terraform, Docker, ArgoCD, Python, Prometheus",
                "5 years",
                "hired",
                "Candidate accepted offer! Start date set for first Monday of next month.",
                5,
                now,
                now
            )
        ]

        cursor.executemany("""
        INSERT INTO applications (
            job_id, user_id, applicant_name, applicant_email, applicant_phone,
            portfolio_url, linkedin_url, resume_filename, resume_filepath,
            cover_letter, skills, experience_years, status,
            admin_notes, rating, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, sample_apps)

        conn.commit()
    conn.close()

# Helper queries
def row_to_dict(row):
    if row is None:
        return None
    return dict(row)

def rows_to_list(rows):
    return [dict(r) for r in rows]

# Authentication / Users
def get_user_by_email(email: str):
    conn = get_connection()
    user = conn.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (email.strip(),)).fetchone()
    conn.close()
    return row_to_dict(user)

def get_user_by_id(user_id: int):
    conn = get_connection()
    user = conn.execute("SELECT id, email, full_name, role, phone, created_at FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return row_to_dict(user)

def create_user(email: str, password: str, full_name: str, role: str = 'user', phone: str = None):
    conn = get_connection()
    now = datetime.now().isoformat()
    pwd_hash = hash_password(password)
    try:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO users (email, password_hash, full_name, role, phone, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (email.strip().lower(), pwd_hash, full_name.strip(), role, phone, now))
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        return get_user_by_id(user_id)
    except sqlite3.IntegrityError:
        conn.close()
        return None

# Jobs
def get_jobs(search=None, department=None, job_type=None, status='open', is_admin=False):
    conn = get_connection()
    query = "SELECT j.*, (SELECT COUNT(*) FROM applications WHERE job_id = j.id) as application_count FROM jobs j WHERE 1=1"
    params = []

    if not is_admin:
        query += " AND status = 'open'"
    elif status and status != 'all':
        query += " AND status = ?"
        params.append(status)

    if department and department != 'all':
        query += " AND department = ?"
        params.append(department)

    if job_type and job_type != 'all':
        query += " AND job_type = ?"
        params.append(job_type)

    if search:
        search_pattern = f"%{search.strip()}%"
        query += " AND (title LIKE ? OR description LIKE ? OR department LIKE ? OR location LIKE ?)"
        params.extend([search_pattern, search_pattern, search_pattern, search_pattern])

    query += " ORDER BY created_at DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return rows_to_list(rows)

def get_job_by_id(job_id: int):
    conn = get_connection()
    row = conn.execute("""
    SELECT j.*, (SELECT COUNT(*) FROM applications WHERE job_id = j.id) as application_count
    FROM jobs j WHERE j.id = ?
    """, (job_id,)).fetchone()
    conn.close()
    return row_to_dict(row)

def create_job(data: dict, created_by: int):
    conn = get_connection()
    now = datetime.now().isoformat()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO jobs (
        title, department, location, job_type, experience_level,
        salary_range, description, requirements, benefits,
        status, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("title", "").strip(),
        data.get("department", "General").strip(),
        data.get("location", "Remote").strip(),
        data.get("job_type", "Full-time").strip(),
        data.get("experience_level", "Mid Level").strip(),
        data.get("salary_range", "").strip(),
        data.get("description", "").strip(),
        data.get("requirements", "").strip(),
        data.get("benefits", "").strip(),
        data.get("status", "open").strip(),
        created_by,
        now,
        now
    ))
    conn.commit()
    job_id = cursor.lastrowid
    conn.close()
    return get_job_by_id(job_id)

def update_job(job_id: int, data: dict):
    conn = get_connection()
    now = datetime.now().isoformat()
    conn.execute("""
    UPDATE jobs SET
        title = ?,
        department = ?,
        location = ?,
        job_type = ?,
        experience_level = ?,
        salary_range = ?,
        description = ?,
        requirements = ?,
        benefits = ?,
        status = ?,
        updated_at = ?
    WHERE id = ?
    """, (
        data.get("title", "").strip(),
        data.get("department", "").strip(),
        data.get("location", "").strip(),
        data.get("job_type", "").strip(),
        data.get("experience_level", "").strip(),
        data.get("salary_range", "").strip(),
        data.get("description", "").strip(),
        data.get("requirements", "").strip(),
        data.get("benefits", "").strip(),
        data.get("status", "open").strip(),
        now,
        job_id
    ))
    conn.commit()
    conn.close()
    return get_job_by_id(job_id)

def delete_job(job_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
    conn.commit()
    conn.close()
    return True

# Applications
def create_application(data: dict):
    conn = get_connection()
    now = datetime.now().isoformat()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO applications (
        job_id, user_id, applicant_name, applicant_email, applicant_phone,
        portfolio_url, linkedin_url, resume_filename, resume_filepath,
        cover_letter, skills, experience_years, status,
        admin_notes, rating, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'applied', '', 0, ?, ?)
    """, (
        data.get("job_id"),
        data.get("user_id"),
        data.get("applicant_name", "").strip(),
        data.get("applicant_email", "").strip().lower(),
        data.get("applicant_phone", "").strip(),
        data.get("portfolio_url", "").strip(),
        data.get("linkedin_url", "").strip(),
        data.get("resume_filename", ""),
        data.get("resume_filepath", ""),
        data.get("cover_letter", "").strip(),
        data.get("skills", "").strip(),
        data.get("experience_years", "").strip(),
        now,
        now
    ))
    conn.commit()
    app_id = cursor.lastrowid
    conn.close()
    return get_application_by_id(app_id)

def get_applications(job_id=None, status=None, search=None, user_id=None, email=None):
    conn = get_connection()
    query = """
    SELECT a.*, j.title as job_title, j.department as job_department, j.location as job_location
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    WHERE 1=1
    """
    params = []

    if user_id:
        query += " AND a.user_id = ?"
        params.append(user_id)
    elif email:
        query += " AND LOWER(a.applicant_email) = LOWER(?)"
        params.append(email.strip())

    if job_id:
        query += " AND a.job_id = ?"
        params.append(job_id)

    if status and status != 'all':
        query += " AND a.status = ?"
        params.append(status)

    if search:
        search_pat = f"%{search.strip()}%"
        query += " AND (a.applicant_name LIKE ? OR a.applicant_email LIKE ? OR a.skills LIKE ? OR j.title LIKE ?)"
        params.extend([search_pat, search_pat, search_pat, search_pat])

    query += " ORDER BY a.created_at DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return rows_to_list(rows)

def get_application_by_id(app_id: int):
    conn = get_connection()
    row = conn.execute("""
    SELECT a.*, j.title as job_title, j.department as job_department, j.location as job_location,
           j.salary_range as job_salary, j.job_type as job_type
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.id = ?
    """, (app_id,)).fetchone()
    conn.close()
    return row_to_dict(row)

def update_application_status(app_id: int, status: str):
    conn = get_connection()
    now = datetime.now().isoformat()
    conn.execute("""
    UPDATE applications SET status = ?, updated_at = ? WHERE id = ?
    """, (status, now, app_id))
    conn.commit()
    conn.close()
    return get_application_by_id(app_id)

def update_application_review(app_id: int, admin_notes: str, rating: int):
    conn = get_connection()
    now = datetime.now().isoformat()
    conn.execute("""
    UPDATE applications SET admin_notes = ?, rating = ?, updated_at = ? WHERE id = ?
    """, (admin_notes, rating, now, app_id))
    conn.commit()
    conn.close()
    return get_application_by_id(app_id)

def get_stats():
    conn = get_connection()
    total_jobs = conn.execute("SELECT COUNT(*) FROM jobs").fetchone()[0]
    open_jobs = conn.execute("SELECT COUNT(*) FROM jobs WHERE status = 'open'").fetchone()[0]
    closed_jobs = conn.execute("SELECT COUNT(*) FROM jobs WHERE status = 'closed'").fetchone()[0]
    total_apps = conn.execute("SELECT COUNT(*) FROM applications").fetchone()[0]
    
    status_counts = {}
    for st in ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected']:
        count = conn.execute("SELECT COUNT(*) FROM applications WHERE status = ?", (st,)).fetchone()[0]
        status_counts[st] = count

    recent_apps = conn.execute("""
        SELECT a.id, a.applicant_name, a.applicant_email, a.status, a.created_at, j.title as job_title
        FROM applications a
        JOIN jobs j ON a.job_id = j.id
        ORDER BY a.created_at DESC LIMIT 5
    """).fetchall()

    conn.close()
    return {
        "total_jobs": total_jobs,
        "open_jobs": open_jobs,
        "closed_jobs": closed_jobs,
        "total_applications": total_apps,
        "status_breakdown": status_counts,
        "recent_applications": [dict(r) for r in recent_apps]
    }

if __name__ == "__main__":
    init_db()
    seed_db()
    print("Database initialized and seeded successfully.")
    stats = get_stats()
    print("Database stats:", json.dumps(stats, indent=2))
