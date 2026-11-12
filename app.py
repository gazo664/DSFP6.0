"""
JobTrack Application Server
Provides REST API endpoints, session management, static file serving,
and candidate resume uploads.
"""
import os
import sys

# Ensure DLL path for Windows SQLite3
try:
    if os.path.exists(r"C:\Program Files\QGIS 3.44.0\bin"):
        os.add_dll_directory(r"C:\Program Files\QGIS 3.44.0\bin")
except Exception:
    pass

import json
import base64
import uuid
import mimetypes
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn
import database as db

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
UPLOADS_DIR = os.path.join(STATIC_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

# In-memory sessions store: token -> user dict
SESSIONS = {}

def create_sample_resumes():
    """Create sample dummy resumes for the seeded applicants so downloads work."""
    samples = {
        "sample_resume_michael.pdf": (
            "MICHAEL CHANG - SENIOR FRONTEND ENGINEER\n"
            "Email: candidate@example.com | Phone: +1 (555) 782-9901 | https://michaelchang.dev\n\n"
            "SUMMARY:\n"
            "Frontend specialist with 6+ years building enterprise SaaS applications using React, TypeScript, and modern state architectures.\n\n"
            "EXPERIENCE:\n"
            "- Senior UI Engineer at CloudWave (2022 - Present)\n"
            "  * Spearheaded modern design system migration reducing design debt by 40%.\n"
            "  * Optimized Core Web Vitals resulting in 35% faster page load times.\n"
            "- Frontend Developer at PixelForge (2019 - 2022)\n"
            "  * Built data-rich analytics dashboards handling 100k daily events.\n\n"
            "SKILLS:\n"
            "React, TypeScript, Next.js, Redux, TailwindCSS, Jest, Cypress, GraphQL, Webpack."
        ),
        "sample_resume_elena.pdf": (
            "ELENA ROSTOVA - UI/FRONTEND DEVELOPER\n"
            "Email: elena.rostova@techmail.io | Phone: +1 (555) 432-8819 | https://github.com/erostova\n\n"
            "SUMMARY:\n"
            "4 years creating pixel-perfect, accessible user interfaces with Vue and React.\n\n"
            "SKILLS:\n"
            "Vue.js, React, HTML5, Sass, CSS Grid, WCAG 2.1 AA Accessibility, Git."
        ),
        "sample_resume_jessica.pdf": (
            "JESSICA VANCE - LEAD PRODUCT DESIGNER\n"
            "Email: jessica.vance@designstudio.org | https://jessicavance.design\n\n"
            "SUMMARY:\n"
            "7 years designing award-winning digital experiences for FinTech and high-growth startups.\n\n"
            "EXPERIENCE:\n"
            "- Principal Product Designer at FinStack (2021 - Present)\n"
            "- Senior UX Designer at Apex Digital (2018 - 2021)\n\n"
            "SKILLS:\n"
            "Figma, Design Tokens, Prototyping, User Research, Journey Mapping, Usability Testing."
        ),
        "sample_resume_marcus.pdf": (
            "MARCUS AURELIUS RIVERA - DEVOPS & INFRASTRUCTURE ENGINEER\n"
            "Email: marcus.rivera@cloudsys.net | https://github.com/mrivera-infra\n\n"
            "SUMMARY:\n"
            "5 years architecting automated cloud infrastructure, container orchestration, and zero-downtime CI/CD pipelines on AWS.\n\n"
            "SKILLS:\n"
            "Kubernetes, AWS (EKS, RDS, S3), Terraform, Docker, ArgoCD, Python, Prometheus, Grafana."
        )
    }
    for filename, content in samples.items():
        file_path = os.path.join(UPLOADS_DIR, filename)
        if not os.path.exists(file_path):
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

class JobTrackHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def log_message(self, format, *args):
        # Concise logging
        print(f"[{self.command}] {args[0]} - {args[1]}")

    def send_json(self, data, status=200):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Session-Token")
        self.end_headers()
        self.wfile.write(body)

    def send_error_json(self, message, status=400):
        self.send_json({"error": message, "success": False}, status=status)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Session-Token")
        self.end_headers()

    def get_token(self):
        # 1. Authorization header: Bearer <token>
        auth_header = self.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            return auth_header[7:].strip()
        # 2. X-Session-Token header
        x_tok = self.headers.get("X-Session-Token", "")
        if x_tok:
            return x_tok.strip()
        # 3. Cookie session_id
        cookie = self.headers.get("Cookie", "")
        for part in cookie.split(";"):
            part = part.strip()
            if part.startswith("session_id="):
                return part.split("=")[1].strip()
        return None

    def get_current_user(self):
        token = self.get_token()
        if token and token in SESSIONS:
            return SESSIONS[token]
        return None

    def read_json_body(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 0:
                raw_data = self.rfile.read(content_length).decode('utf-8')
                return json.loads(raw_data)
            return {}
        except Exception as e:
            print("Error parsing json body:", e)
            return {}

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # API Routes
        if path.startswith("/api/"):
            self.handle_api_get(path, query)
            return

        # Serve uploaded files from /uploads/...
        if path.startswith("/uploads/"):
            file_name = os.path.basename(path)
            file_path = os.path.join(UPLOADS_DIR, file_name)
            if os.path.exists(file_path):
                self.serve_file(file_path)
                return
            else:
                self.send_error(404, "File not found")
                return

        # Serve static files or fallback to index.html for SPA routes
        target_file = os.path.join(STATIC_DIR, path.lstrip("/"))
        if os.path.exists(target_file) and not os.path.isdir(target_file):
            return super().do_GET()

        index_path = os.path.join(STATIC_DIR, "index.html")
        if os.path.exists(index_path):
            self.serve_file(index_path, content_type="text/html; charset=utf-8")
        else:
            self.send_error(404, "index.html missing")

    def serve_file(self, filepath, content_type=None):
        try:
            if not content_type:
                content_type, _ = mimetypes.guess_type(filepath)
                if not content_type:
                    content_type = "application/octet-stream"
            with open(filepath, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_error(500, str(e))

    def handle_api_get(self, path, query):
        user = self.get_current_user()

        # GET /api/auth/me
        if path == "/api/auth/me":
            if user:
                self.send_json({"user": user, "authenticated": True})
            else:
                self.send_json({"user": None, "authenticated": False})
            return

        # GET /api/stats (Admin stats)
        if path == "/api/admin/stats":
            if not user or user.get("role") != "admin":
                self.send_error_json("Unauthorized: Admin access required", 403)
                return
            stats = db.get_stats()
            self.send_json({"stats": stats, "success": True})
            return

        # GET /api/departments
        if path == "/api/departments":
            jobs = db.get_jobs(is_admin=True)
            deps = sorted(list(set(j["department"] for j in jobs if j.get("department"))))
            self.send_json({"departments": deps})
            return

        # GET /api/jobs
        if path == "/api/jobs":
            search = query.get("search", [None])[0]
            department = query.get("department", [None])[0]
            job_type = query.get("job_type", [None])[0]
            status = query.get("status", [None])[0]
            
            is_admin = (user is not None and user.get("role") == "admin")
            jobs = db.get_jobs(search=search, department=department, job_type=job_type, status=status, is_admin=is_admin)
            self.send_json({"jobs": jobs, "count": len(jobs), "success": True})
            return

        # GET /api/jobs/<id>
        if path.startswith("/api/jobs/"):
            parts = path.strip("/").split("/")
            if len(parts) == 3 and parts[2].isdigit():
                job_id = int(parts[2])
                job = db.get_job_by_id(job_id)
                if not job:
                    self.send_error_json("Job not found", 404)
                    return
                self.send_json({"job": job, "success": True})
                return

        # GET /api/applications
        if path == "/api/applications":
            job_id = query.get("job_id", [None])[0]
            status = query.get("status", [None])[0]
            search = query.get("search", [None])[0]
            user_filter = query.get("user_id", [None])[0]
            email_filter = query.get("email", [None])[0]

            is_admin = (user is not None and user.get("role") == "admin")

            if is_admin:
                apps = db.get_applications(job_id=job_id, status=status, search=search, user_id=user_filter, email=email_filter)
            elif user:
                # Normal logged in user can only see their own applications
                apps = db.get_applications(user_id=user["id"], job_id=job_id, status=status, search=search)
            else:
                # If guest provides email query param, allow tracking by email
                if email_filter:
                    apps = db.get_applications(email=email_filter, job_id=job_id, status=status)
                else:
                    self.send_error_json("Authentication required or email parameter required", 401)
                    return

            self.send_json({"applications": apps, "count": len(apps), "success": True})
            return

        # GET /api/applications/<id>
        if path.startswith("/api/applications/"):
            parts = path.strip("/").split("/")
            if len(parts) == 3 and parts[2].isdigit():
                app_id = int(parts[2])
                app_obj = db.get_application_by_id(app_id)
                if not app_obj:
                    self.send_error_json("Application not found", 404)
                    return
                # Authorization check
                if user and user.get("role") == "admin":
                    self.send_json({"application": app_obj, "success": True})
                    return
                elif user and app_obj.get("user_id") == user["id"]:
                    self.send_json({"application": app_obj, "success": True})
                    return
                else:
                    self.send_json({"application": app_obj, "success": True})
                    return

        self.send_error_json("API endpoint not found", 404)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        user = self.get_current_user()

        # POST /api/auth/login
        if path == "/api/auth/login":
            data = self.read_json_body()
            email = data.get("email", "").strip()
            password = data.get("password", "").strip()

            db_user = db.get_user_by_email(email)
            if not db_user:
                self.send_error_json("Invalid email or password", 401)
                return

            if db.hash_password(password) != db_user["password_hash"]:
                self.send_error_json("Invalid email or password", 401)
                return

            token = str(uuid.uuid4())
            user_info = {
                "id": db_user["id"],
                "email": db_user["email"],
                "full_name": db_user["full_name"],
                "role": db_user["role"],
                "phone": db_user["phone"]
            }
            SESSIONS[token] = user_info

            self.send_json({
                "success": True,
                "token": token,
                "user": user_info,
                "message": f"Welcome back, {user_info['full_name']}!"
            })
            return

        # POST /api/auth/register
        if path == "/api/auth/register":
            data = self.read_json_body()
            email = data.get("email", "").strip()
            password = data.get("password", "").strip()
            full_name = data.get("full_name", "").strip()
            phone = data.get("phone", "").strip()
            role = data.get("role", "user")

            if not email or not password or not full_name:
                self.send_error_json("Email, password, and full name are required", 400)
                return

            existing = db.get_user_by_email(email)
            if existing:
                self.send_error_json("An account with this email already exists", 400)
                return

            new_user = db.create_user(email, password, full_name, role=role, phone=phone)
            if not new_user:
                self.send_error_json("Failed to create user", 500)
                return

            token = str(uuid.uuid4())
            user_info = {
                "id": new_user["id"],
                "email": new_user["email"],
                "full_name": new_user["full_name"],
                "role": new_user["role"],
                "phone": new_user["phone"]
            }
            SESSIONS[token] = user_info

            self.send_json({
                "success": True,
                "token": token,
                "user": user_info,
                "message": f"Account created! Welcome, {user_info['full_name']}."
            })
            return

        # POST /api/auth/logout
        if path == "/api/auth/logout":
            token = self.get_token()
            if token and token in SESSIONS:
                del SESSIONS[token]
            self.send_json({"success": True, "message": "Logged out successfully"})
            return

        # POST /api/jobs (Admin only: create job opening)
        if path == "/api/jobs":
            if not user or user.get("role") != "admin":
                self.send_error_json("Unauthorized: Admin access required", 403)
                return
            data = self.read_json_body()
            if not data.get("title") or not data.get("description"):
                self.send_error_json("Title and Description are required", 400)
                return
            job = db.create_job(data, created_by=user["id"])
            self.send_json({"success": True, "job": job, "message": "Job opening published successfully!"})
            return

        # POST /api/applications (Apply to a job)
        if path == "/api/applications":
            data = self.read_json_body()
            job_id = data.get("job_id")
            if not job_id:
                self.send_error_json("job_id is required", 400)
                return

            job = db.get_job_by_id(job_id)
            if not job:
                self.send_error_json("Job opening not found", 404)
                return

            if job.get("status") == "closed":
                self.send_error_json("This job opening is currently closed for applications", 400)
                return

            applicant_name = data.get("applicant_name", "").strip()
            applicant_email = data.get("applicant_email", "").strip()

            if not applicant_name or not applicant_email:
                self.send_error_json("Name and Email are required", 400)
                return

            # Handle resume base64 upload if provided
            resume_data = data.get("resume_data") # data:application/pdf;base64,...
            resume_filename = data.get("resume_filename", "")
            resume_filepath = ""

            if resume_data and resume_filename:
                try:
                    # Clean filename
                    safe_name = "".join(c for c in resume_filename if c.isalnum() or c in "._- ")
                    unique_name = f"{uuid.uuid4().hex[:8]}_{safe_name}"
                    save_path = os.path.join(UPLOADS_DIR, unique_name)

                    if "," in resume_data:
                        resume_data = resume_data.split(",", 1)[1]
                    file_bytes = base64.b64decode(resume_data)
                    with open(save_path, "wb") as f:
                        f.write(file_bytes)
                    resume_filepath = f"uploads/{unique_name}"
                except Exception as e:
                    print("Error saving uploaded resume:", e)
                    # continue without failing application

            # Link with user_id if logged in
            app_data = {
                "job_id": job_id,
                "user_id": user["id"] if user else None,
                "applicant_name": applicant_name,
                "applicant_email": applicant_email,
                "applicant_phone": data.get("applicant_phone", ""),
                "portfolio_url": data.get("portfolio_url", ""),
                "linkedin_url": data.get("linkedin_url", ""),
                "resume_filename": resume_filename or "Resume_Attached.pdf",
                "resume_filepath": resume_filepath or ("uploads/sample_resume_michael.pdf" if not resume_data else ""),
                "cover_letter": data.get("cover_letter", ""),
                "skills": data.get("skills", ""),
                "experience_years": data.get("experience_years", "")
            }

            application = db.create_application(app_data)
            self.send_json({
                "success": True,
                "application": application,
                "message": "Your application was submitted successfully! The hiring team has received your details."
            })
            return

        # POST /api/seed/reset (Admin or demo reset)
        if path == "/api/seed/reset":
            db.init_db()
            db.seed_db()
            self.send_json({"success": True, "message": "Demo database successfully refreshed with sample jobs and applications!"})
            return

        self.send_error_json("API endpoint not found", 404)

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        user = self.get_current_user()

        # PUT /api/jobs/<id> (Admin only)
        if path.startswith("/api/jobs/"):
            parts = path.strip("/").split("/")
            if len(parts) == 3 and parts[2].isdigit():
                if not user or user.get("role") != "admin":
                    self.send_error_json("Unauthorized: Admin access required", 403)
                    return
                job_id = int(parts[2])
                data = self.read_json_body()
                updated_job = db.update_job(job_id, data)
                self.send_json({"success": True, "job": updated_job, "message": "Job opening updated successfully!"})
                return

        self.send_error_json("API endpoint not found", 404)

    def do_PATCH(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        user = self.get_current_user()

        # PATCH /api/jobs/<id>/status (Admin only)
        if path.startswith("/api/jobs/") and path.endswith("/status"):
            parts = path.strip("/").split("/")
            if len(parts) == 4 and parts[2].isdigit():
                if not user or user.get("role") != "admin":
                    self.send_error_json("Unauthorized: Admin access required", 403)
                    return
                job_id = int(parts[2])
                data = self.read_json_body()
                status = data.get("status", "open")
                job = db.get_job_by_id(job_id)
                if not job:
                    self.send_error_json("Job not found", 404)
                    return
                job["status"] = status
                updated_job = db.update_job(job_id, job)
                self.send_json({"success": True, "job": updated_job, "message": f"Job status updated to '{status}'"})
                return

        # PATCH /api/applications/<id>/status (Admin only)
        if path.startswith("/api/applications/") and path.endswith("/status"):
            parts = path.strip("/").split("/")
            if len(parts) == 4 and parts[2].isdigit():
                if not user or user.get("role") != "admin":
                    self.send_error_json("Unauthorized: Admin access required", 403)
                    return
                app_id = int(parts[2])
                data = self.read_json_body()
                status = data.get("status")
                if status not in ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected']:
                    self.send_error_json("Invalid status value", 400)
                    return
                updated_app = db.update_application_status(app_id, status)
                self.send_json({"success": True, "application": updated_app, "message": f"Application status updated to '{status}'"})
                return

        # PATCH /api/applications/<id>/review (Admin only: notes & rating)
        if path.startswith("/api/applications/") and path.endswith("/review"):
            parts = path.strip("/").split("/")
            if len(parts) == 4 and parts[2].isdigit():
                if not user or user.get("role") != "admin":
                    self.send_error_json("Unauthorized: Admin access required", 403)
                    return
                app_id = int(parts[2])
                data = self.read_json_body()
                notes = data.get("admin_notes", "")
                rating = int(data.get("rating", 0))
                updated_app = db.update_application_review(app_id, notes, rating)
                self.send_json({"success": True, "application": updated_app, "message": "Candidate review saved!"})
                return

        self.send_error_json("API endpoint not found", 404)

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        user = self.get_current_user()

        # DELETE /api/jobs/<id> (Admin only)
        if path.startswith("/api/jobs/"):
            parts = path.strip("/").split("/")
            if len(parts) == 3 and parts[2].isdigit():
                if not user or user.get("role") != "admin":
                    self.send_error_json("Unauthorized: Admin access required", 403)
                    return
                job_id = int(parts[2])
                db.delete_job(job_id)
                self.send_json({"success": True, "message": "Job opening deleted successfully"})
                return

        self.send_error_json("API endpoint not found", 404)

def run_server(port=8000):
    db.init_db()
    db.seed_db()
    create_sample_resumes()
    
    server_address = ('0.0.0.0', port)
    try:
        httpd = ThreadedHTTPServer(server_address, JobTrackHandler)
    except OSError:
        # If port 8000 is in use, fallback to 8080
        port = 8080
        server_address = ('0.0.0.0', port)
        httpd = ThreadedHTTPServer(server_address, JobTrackHandler)

    print("=" * 60, flush=True)
    print(f"🚀 JobTrack Web Server running at: http://localhost:{port}", flush=True)
    print(f"📁 Serving static files from: {STATIC_DIR}", flush=True)
    print("🔑 Demo Credentials:", flush=True)
    print("   • Admin:     admin@jobtrack.io / admin123", flush=True)
    print("   • Candidate: candidate@example.com / candidate123", flush=True)
    print("=" * 60, flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...", flush=True)
        httpd.server_close()

if __name__ == "__main__":
    port = 8000
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        port = int(sys.argv[1])
    run_server(port)

