/**
 * JobTrack Application - Modern Light Blue Single Page Application
 */

const STATE = {
  currentUser: null,
  activeRole: 'candidate', // 'candidate' or 'admin'
  currentTab: 'jobs',      // candidate: 'jobs', 'my-applications' | admin: 'admin-dashboard', 'admin-jobs', 'admin-pipeline'
  jobs: [],
  departments: [],
  applications: [],
  adminStats: null,
  filters: {
    search: '',
    department: 'all',
    job_type: 'all',
    status: 'open'
  },
  pipelineFilter: {
    job_id: 'all',
    status: 'all',
    search: ''
  },
  selectedJob: null,
  selectedApplication: null,
  uploadedResume: {
    name: '',
    base64: ''
  }
};

// API Client
const API = {
  token: localStorage.getItem('jobtrack_token') || '',

  headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.token) {
      h['Authorization'] = `Bearer ${this.token}`;
      h['X-Session-Token'] = this.token;
    }
    return h;
  },

  setToken(t) {
    this.token = t;
    if (t) {
      localStorage.setItem('jobtrack_token', t);
    } else {
      localStorage.removeItem('jobtrack_token');
    }
  },

  async request(endpoint, options = {}) {
    options.headers = { ...this.headers(), ...(options.headers || {}) };
    try {
      const res = await fetch(endpoint, options);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Server request failed');
      }
      return data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      throw err;
    }
  },

  async checkAuth() {
    if (!this.token) return null;
    try {
      const res = await this.request('/api/auth/me');
      return res.user;
    } catch {
      this.setToken('');
      return null;
    }
  },

  async login(email, password) {
    const res = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setToken(res.token);
    return res;
  },

  async register(data) {
    const res = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    this.setToken(res.token);
    return res;
  },

  async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    this.setToken('');
    STATE.currentUser = null;
  },

  async getJobs(params = {}) {
    const q = new URLSearchParams(params).toString();
    return await this.request(`/api/jobs?${q}`);
  },

  async getJob(id) {
    return await this.request(`/api/jobs/${id}`);
  },

  async createJob(jobData) {
    return await this.request('/api/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData)
    });
  },

  async updateJob(id, jobData) {
    return await this.request(`/api/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(jobData)
    });
  },

  async toggleJobStatus(id, status) {
    return await this.request(`/api/jobs/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  async deleteJob(id) {
    return await this.request(`/api/jobs/${id}`, { method: 'DELETE' });
  },

  async applyToJob(appData) {
    return await this.request('/api/applications', {
      method: 'POST',
      body: JSON.stringify(appData)
    });
  },

  async getApplications(params = {}) {
    const q = new URLSearchParams(params).toString();
    return await this.request(`/api/applications?${q}`);
  },

  async getApplication(id) {
    return await this.request(`/api/applications/${id}`);
  },

  async updateApplicationStatus(id, status) {
    return await this.request(`/api/applications/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  async updateApplicationReview(id, admin_notes, rating) {
    return await this.request(`/api/applications/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ admin_notes, rating })
    });
  },

  async getAdminStats() {
    return await this.request('/api/admin/stats');
  },

  async getDepartments() {
    return await this.request('/api/departments');
  },

  async resetDemoData() {
    return await this.request('/api/seed/reset', { method: 'POST' });
  }
};

// UI Toast Notification
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' 
    ? '✓' 
    : type === 'error' 
      ? '✕' 
      : 'ℹ';

  toast.innerHTML = `
    <div style="font-weight: 700; color: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#0284c7'}">${icon}</div>
    <div style="flex: 1; font-size: 0.9rem; color: #334155;">${escapeHtml(message)}</div>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatRelativeTime(dateStr) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.round((now - d) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.round(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  } catch {
    return 'Recently';
  }
}

// Status Badges Utility
function getStatusBadge(status) {
  const map = {
    'applied': { label: 'Applied', class: 'badge-sky', icon: '📝' },
    'screening': { label: 'Screening', class: 'badge-amber', icon: '🔍' },
    'interview': { label: 'Interview Scheduled', class: 'badge-indigo', icon: '🗓️' },
    'offer': { label: 'Offer Extended', class: 'badge-emerald', icon: '🎉' },
    'hired': { label: 'Hired', class: 'badge-emerald', icon: '⭐' },
    'rejected': { label: 'Not Selected', class: 'badge-rose', icon: '✕' },
    'open': { label: 'Active Opening', class: 'badge-sky', icon: '●' },
    'closed': { label: 'Closed', class: 'badge-slate', icon: '○' }
  };
  const s = map[status] || { label: status, class: 'badge-slate', icon: '' };
  return `<span class="badge ${s.class}">${s.icon} ${s.label}</span>`;
}

// Application Initialization
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  
  // Check active session
  try {
    const user = await API.checkAuth();
    if (user) {
      STATE.currentUser = user;
      STATE.activeRole = user.role === 'admin' ? 'admin' : 'candidate';
      STATE.currentTab = user.role === 'admin' ? 'admin-dashboard' : 'jobs';
    }
  } catch (err) {
    console.warn("Auth check failed:", err);
  }

  await loadInitialData();
  renderApp();
});

async function loadInitialData() {
  try {
    const [jobsRes, depRes] = await Promise.all([
      API.getJobs({ is_admin: STATE.activeRole === 'admin' ? 'true' : 'false' }),
      API.getDepartments()
    ]);
    STATE.jobs = jobsRes.jobs || [];
    STATE.departments = depRes.departments || [];
  } catch (e) {
    console.error("Failed loading jobs:", e);
  }
}

function setupEventListeners() {
  // Global Escape key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });

  // Modal backdrop click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeAllModals();
      }
    });
  });

  // Search input debounce
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        STATE.filters.search = e.target.value;
        filterAndRenderJobs();
      }, 250);
    });
  }

  // Department Filter
  const depSelect = document.getElementById('filter-department');
  if (depSelect) {
    depSelect.addEventListener('change', (e) => {
      STATE.filters.department = e.target.value;
      filterAndRenderJobs();
    });
  }

  // Job Type Filter
  const typeSelect = document.getElementById('filter-job-type');
  if (typeSelect) {
    typeSelect.addEventListener('change', (e) => {
      STATE.filters.job_type = e.target.value;
      filterAndRenderJobs();
    });
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
}

// Role Switch Handler
function switchRole(role) {
  STATE.activeRole = role;
  if (role === 'admin') {
    STATE.currentTab = 'admin-dashboard';
  } else {
    STATE.currentTab = 'jobs';
  }
  renderApp();
  showToast(`Switched view to ${role === 'admin' ? 'Admin / Recruiter Portal' : 'Candidate / Job Seeker'}`, 'info');
}

function switchTab(tab) {
  STATE.currentTab = tab;
  renderApp();
}

// Master Render Router
async function renderApp() {
  renderNavbar();
  
  const heroSection = document.getElementById('hero-section');
  const candidateViews = document.getElementById('candidate-views');
  const adminViews = document.getElementById('admin-views');

  if (STATE.activeRole === 'candidate') {
    adminViews.style.display = 'none';
    candidateViews.style.display = 'block';

    if (STATE.currentTab === 'jobs') {
      heroSection.style.display = 'block';
      document.getElementById('view-jobs-list').style.display = 'block';
      document.getElementById('view-my-applications').style.display = 'none';
      await filterAndRenderJobs();
    } else if (STATE.currentTab === 'my-applications') {
      heroSection.style.display = 'none';
      document.getElementById('view-jobs-list').style.display = 'none';
      document.getElementById('view-my-applications').style.display = 'block';
      await renderMyApplications();
    }
  } else {
    // Admin Role
    heroSection.style.display = 'none';
    candidateViews.style.display = 'none';
    adminViews.style.display = 'block';

    document.getElementById('admin-tab-dashboard').style.display = STATE.currentTab === 'admin-dashboard' ? 'block' : 'none';
    document.getElementById('admin-tab-jobs').style.display = STATE.currentTab === 'admin-jobs' ? 'block' : 'none';
    document.getElementById('admin-tab-pipeline').style.display = STATE.currentTab === 'admin-pipeline' ? 'block' : 'none';

    if (STATE.currentTab === 'admin-dashboard') {
      await renderAdminDashboard();
    } else if (STATE.currentTab === 'admin-jobs') {
      await renderAdminJobs();
    } else if (STATE.currentTab === 'admin-pipeline') {
      await renderAdminPipeline();
    }
  }
}

// Navbar Renderer
function renderNavbar() {
  // Update Role Switcher
  const candidatePill = document.getElementById('role-pill-candidate');
  const adminPill = document.getElementById('role-pill-admin');
  if (candidatePill && adminPill) {
    if (STATE.activeRole === 'candidate') {
      candidatePill.classList.add('active');
      adminPill.classList.remove('active');
    } else {
      adminPill.classList.add('active');
      candidatePill.classList.remove('active');
    }
  }

  // Update Navigation links container
  const navContainer = document.getElementById('nav-links-container');
  if (!navContainer) return;

  if (STATE.activeRole === 'candidate') {
    navContainer.innerHTML = `
      <div class="nav-link ${STATE.currentTab === 'jobs' ? 'active' : ''}" onclick="switchTab('jobs')">
        <span>🔍</span> Find Jobs
      </div>
      <div class="nav-link ${STATE.currentTab === 'my-applications' ? 'active' : ''}" onclick="switchTab('my-applications')">
        <span>📋</span> My Applications
      </div>
    `;
  } else {
    navContainer.innerHTML = `
      <div class="nav-link ${STATE.currentTab === 'admin-dashboard' ? 'active' : ''}" onclick="switchTab('admin-dashboard')">
        <span>📊</span> Dashboard
      </div>
      <div class="nav-link ${STATE.currentTab === 'admin-jobs' ? 'active' : ''}" onclick="switchTab('admin-jobs')">
        <span>💼</span> Manage Openings
      </div>
      <div class="nav-link ${STATE.currentTab === 'admin-pipeline' ? 'active' : ''}" onclick="switchTab('admin-pipeline')">
        <span>👥</span> Candidate Tracker
      </div>
    `;
  }

  // Auth Button
  const authContainer = document.getElementById('nav-auth-container');
  if (!authContainer) return;

  if (STATE.currentUser) {
    authContainer.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <div style="text-align: right; line-height: 1.2;">
          <div style="font-size: 0.85rem; font-weight: 600; color: #0f172a;">${escapeHtml(STATE.currentUser.full_name)}</div>
          <div style="font-size: 0.75rem; color: #0284c7; text-transform: capitalize;">${STATE.currentUser.role} Account</div>
        </div>
        <button class="btn btn-outline btn-sm" onclick="handleLogout()">Sign Out</button>
      </div>
    `;
  } else {
    authContainer.innerHTML = `
      <button class="btn btn-secondary btn-sm" onclick="openLoginModal('user')">Candidate Login</button>
      <button class="btn btn-primary btn-sm" onclick="openLoginModal('admin')">Admin Login</button>
    `;
  }
}

// Quick Demo Login & Switch Helper
async function quickDemoLogin(role) {
  try {
    const creds = role === 'admin' 
      ? { email: 'admin@jobtrack.io', password: 'admin123' }
      : { email: 'candidate@example.com', password: 'candidate123' };

    const res = await API.login(creds.email, creds.password);
    STATE.currentUser = res.user;
    STATE.activeRole = res.user.role === 'admin' ? 'admin' : 'candidate';
    STATE.currentTab = res.user.role === 'admin' ? 'admin-dashboard' : 'jobs';
    closeAllModals();
    showToast(`Logged in as ${res.user.full_name} (${res.user.role})`, 'success');
    renderApp();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleLogout() {
  await API.logout();
  STATE.currentUser = null;
  STATE.activeRole = 'candidate';
  STATE.currentTab = 'jobs';
  showToast("Logged out successfully", 'info');
  renderApp();
}

// -------------------------------------------------------------
// CANDIDATE VIEW: Job Openings & Details
// -------------------------------------------------------------
async function filterAndRenderJobs() {
  const container = document.getElementById('jobs-grid-container');
  const countBadge = document.getElementById('jobs-count-badge');
  if (!container) return;

  container.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
      <div style="color: #0284c7; font-size: 1.2rem; font-weight: 600;">Loading open opportunities...</div>
    </div>
  `;

  try {
    const res = await API.getJobs({
      search: STATE.filters.search,
      department: STATE.filters.department,
      job_type: STATE.filters.job_type,
      status: 'open'
    });
    STATE.jobs = res.jobs || [];

    if (countBadge) {
      countBadge.innerText = `${STATE.jobs.length} Active Positions`;
    }

    // Populate department filter dropdown if empty
    populateDepartmentDropdown();

    if (STATE.jobs.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem; background: white; border-radius: var(--radius-xl); border: 1px dashed var(--primary-200);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
          <h3 style="font-size: 1.2rem; font-weight: 700; color: #1e293b;">No matching openings found</h3>
          <p style="color: #64748b; font-size: 0.9rem; margin-top: 0.35rem;">Try adjusting your keyword search or filter criteria.</p>
          <button class="btn btn-secondary btn-sm" style="margin-top: 1rem;" onclick="resetFilters()">Reset All Filters</button>
        </div>
      `;
      return;
    }

    container.innerHTML = STATE.jobs.map(job => `
      <div class="job-card">
        <div>
          <div class="job-card-header">
            <h3 class="job-title">${escapeHtml(job.title)}</h3>
            <span class="badge badge-sky">${escapeHtml(job.department)}</span>
          </div>

          <div class="job-meta-row">
            <span class="badge badge-slate">📍 ${escapeHtml(job.location)}</span>
            <span class="badge badge-slate">⏱️ ${escapeHtml(job.job_type)}</span>
            <span class="badge badge-slate">📈 ${escapeHtml(job.experience_level)}</span>
          </div>

          <p class="job-snippet">${escapeHtml(job.description)}</p>
        </div>

        <div class="job-card-footer">
          <div>
            <div class="job-salary">${escapeHtml(job.salary_range || 'Competitive')}</div>
            <div class="job-posted-time">Posted ${formatRelativeTime(job.created_at)}</div>
          </div>
          <div style="display: flex; gap: 0.4rem;">
            <button class="btn btn-outline btn-sm" onclick="viewJobDetails(${job.id})">Details</button>
            <button class="btn btn-primary btn-sm" onclick="openApplyModal(${job.id})">Apply Now</button>
          </div>
        </div>
      </div>
    `).join('');

  } catch (err) {
    container.innerHTML = `<div style="grid-column: 1/-1; color: #ef4444; padding: 2rem; text-align: center;">Error loading jobs: ${err.message}</div>`;
  }
}

function populateDepartmentDropdown() {
  const sel = document.getElementById('filter-department');
  if (!sel) return;

  const currentVal = STATE.filters.department;
  const deps = Array.from(new Set(STATE.jobs.map(j => j.department).filter(Boolean))).sort();
  
  sel.innerHTML = '<option value="all">All Departments</option>' + 
    deps.map(d => `<option value="${escapeHtml(d)}" ${currentVal === d ? 'selected' : ''}>${escapeHtml(d)}</option>`).join('');
}

function setQuickFilter(type, value) {
  if (type === 'type') {
    STATE.filters.job_type = value;
    const sel = document.getElementById('filter-job-type');
    if (sel) sel.value = value;
  } else if (type === 'search') {
    STATE.filters.search = value;
    const inp = document.getElementById('search-input');
    if (inp) inp.value = value;
  }
  filterAndRenderJobs();
}

function resetFilters() {
  STATE.filters = { search: '', department: 'all', job_type: 'all', status: 'open' };
  const searchInp = document.getElementById('search-input');
  const depSel = document.getElementById('filter-department');
  const typeSel = document.getElementById('filter-job-type');
  if (searchInp) searchInp.value = '';
  if (depSel) depSel.value = 'all';
  if (typeSel) typeSel.value = 'all';
  filterAndRenderJobs();
}

// View Job Details Modal
async function viewJobDetails(jobId) {
  const modal = document.getElementById('job-details-modal');
  const body = document.getElementById('job-details-body');
  if (!modal || !body) return;

  try {
    const res = await API.getJob(jobId);
    const job = res.job;
    STATE.selectedJob = job;

    body.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
          <span class="badge badge-sky">${escapeHtml(job.department)}</span>
          <span class="badge badge-slate">${escapeHtml(job.job_type)}</span>
          <span class="badge badge-slate">${escapeHtml(job.experience_level)}</span>
        </div>
        <h2 style="font-size: 1.6rem; font-weight: 800; color: #0f172a; margin-bottom: 0.5rem;">${escapeHtml(job.title)}</h2>
        <div style="display: flex; align-items: center; gap: 1rem; color: #64748b; font-size: 0.9rem;">
          <span>📍 ${escapeHtml(job.location)}</span>
          <span>💰 ${escapeHtml(job.salary_range || 'Competitive Compensation')}</span>
          <span>📅 Posted ${formatRelativeTime(job.created_at)}</span>
        </div>
      </div>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 1.25rem;">
        <h4 style="font-size: 1rem; font-weight: 700; color: #1e293b; margin-bottom: 0.6rem;">About the Role</h4>
        <div style="color: #334155; line-height: 1.6; white-space: pre-line; font-size: 0.95rem; margin-bottom: 1.5rem;">${escapeHtml(job.description)}</div>

        ${job.requirements ? `
          <h4 style="font-size: 1rem; font-weight: 700; color: #1e293b; margin-bottom: 0.6rem;">Requirements & Skills</h4>
          <div style="color: #334155; line-height: 1.6; white-space: pre-line; font-size: 0.95rem; margin-bottom: 1.5rem; background: #f8fafc; padding: 1rem; border-radius: var(--radius-md); border-left: 3px solid #38bdf8;">${escapeHtml(job.requirements)}</div>
        ` : ''}

        ${job.benefits ? `
          <h4 style="font-size: 1rem; font-weight: 700; color: #1e293b; margin-bottom: 0.6rem;">Benefits & Perks</h4>
          <div style="color: #334155; line-height: 1.6; white-space: pre-line; font-size: 0.95rem; margin-bottom: 1.5rem; background: #f0fdf4; padding: 1rem; border-radius: var(--radius-md); border-left: 3px solid #10b981;">${escapeHtml(job.benefits)}</div>
        ` : ''}
      </div>
    `;

    document.getElementById('job-details-apply-btn').onclick = () => {
      closeAllModals();
      openApplyModal(job.id);
    };

    modal.classList.add('open');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------
// CANDIDATE APPLICATION FORM & SUBMISSION
// -------------------------------------------------------------
async function openApplyModal(jobId) {
  const modal = document.getElementById('apply-modal');
  if (!modal) return;

  let job = STATE.jobs.find(j => j.id === jobId);
  if (!job) {
    try {
      const res = await API.getJob(jobId);
      job = res.job;
    } catch {
      showToast('Could not load job details', 'error');
      return;
    }
  }
  STATE.selectedJob = job;

  document.getElementById('apply-modal-job-title').innerText = `Apply for: ${job.title}`;
  document.getElementById('apply-job-id').value = job.id;

  // Prepopulate if logged in
  if (STATE.currentUser) {
    document.getElementById('apply-name').value = STATE.currentUser.full_name || '';
    document.getElementById('apply-email').value = STATE.currentUser.email || '';
    document.getElementById('apply-phone').value = STATE.currentUser.phone || '';
  }

  // Reset resume upload preview
  STATE.uploadedResume = { name: '', base64: '' };
  const resumePreview = document.getElementById('resume-file-preview');
  if (resumePreview) {
    resumePreview.style.display = 'none';
    resumePreview.innerHTML = '';
  }

  setupDropzone();
  modal.classList.add('open');
}

function setupDropzone() {
  const dropzone = document.getElementById('resume-dropzone');
  const fileInput = document.getElementById('resume-file-input');
  const preview = document.getElementById('resume-file-preview');
  if (!dropzone || !fileInput) return;

  dropzone.onclick = () => fileInput.click();

  ['dragenter', 'dragover'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleResumeFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.onchange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleResumeFile(e.target.files[0]);
    }
  };
}

function handleResumeFile(file) {
  const preview = document.getElementById('resume-file-preview');
  if (!preview) return;

  STATE.uploadedResume.name = file.name;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    STATE.uploadedResume.base64 = e.target.result;
    preview.style.display = 'flex';
    preview.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem; background: #e0f2fe; padding: 0.6rem 1rem; border-radius: var(--radius-md); border: 1px solid #7dd3fc; width: 100%; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span style="font-size: 1.25rem;">📄</span>
          <div>
            <div style="font-weight: 600; font-size: 0.85rem; color: #0369a1;">${escapeHtml(file.name)}</div>
            <div style="font-size: 0.75rem; color: #0284c7;">${(file.size / 1024).toFixed(1)} KB • Ready to upload</div>
          </div>
        </div>
        <button type="button" class="btn btn-outline btn-sm" style="padding: 0.2rem 0.5rem;" onclick="removeResumeFile(event)">✕</button>
      </div>
    `;
  };
  reader.readAsDataURL(file);
}

function removeResumeFile(e) {
  if (e) e.stopPropagation();
  STATE.uploadedResume = { name: '', base64: '' };
  const preview = document.getElementById('resume-file-preview');
  if (preview) {
    preview.style.display = 'none';
    preview.innerHTML = '';
  }
  const fileInput = document.getElementById('resume-file-input');
  if (fileInput) fileInput.value = '';
}

async function handleApplicationSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  const jobId = parseInt(document.getElementById('apply-job-id').value);
  const applicantName = document.getElementById('apply-name').value.trim();
  const applicantEmail = document.getElementById('apply-email').value.trim();
  const applicantPhone = document.getElementById('apply-phone').value.trim();
  const linkedinUrl = document.getElementById('apply-linkedin').value.trim();
  const portfolioUrl = document.getElementById('apply-portfolio').value.trim();
  const experienceYears = document.getElementById('apply-experience').value.trim();
  const skills = document.getElementById('apply-skills').value.trim();
  const coverLetter = document.getElementById('apply-cover-letter').value.trim();

  if (!applicantName || !applicantEmail) {
    showToast("Full Name and Email are required", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerText = "Submitting Application...";

  try {
    const payload = {
      job_id: jobId,
      applicant_name: applicantName,
      applicant_email: applicantEmail,
      applicant_phone: applicantPhone,
      linkedin_url: linkedinUrl,
      portfolio_url: portfolioUrl,
      experience_years: experienceYears,
      skills: skills,
      cover_letter: coverLetter,
      resume_filename: STATE.uploadedResume.name || 'Resume_Document.pdf',
      resume_data: STATE.uploadedResume.base64 || ''
    };

    const res = await API.applyToJob(payload);
    closeAllModals();
    showToast(res.message || "Application submitted successfully!", "success");

    // If user is candidate, offer to view status in My Applications
    form.reset();
    removeResumeFile();

    // Switch to My Applications view automatically to celebrate and show status
    switchTab('my-applications');
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = "Submit Application";
  }
}

// -------------------------------------------------------------
// MY APPLICATIONS TRACKER VIEW (CANDIDATE)
// -------------------------------------------------------------
async function renderMyApplications() {
  const container = document.getElementById('my-applications-list');
  if (!container) return;

  let queryEmail = '';
  if (!STATE.currentUser) {
    const emailInput = document.getElementById('track-by-email-input');
    queryEmail = emailInput ? emailInput.value.trim() : '';
  }

  container.innerHTML = `
    <div style="text-align: center; padding: 2.5rem;">
      <div style="color: #0284c7; font-weight: 600;">Fetching your applications...</div>
    </div>
  `;

  try {
    const params = {};
    if (STATE.currentUser) {
      params.user_id = STATE.currentUser.id;
    } else if (queryEmail) {
      params.email = queryEmail;
    } else {
      container.innerHTML = `
        <div style="background: white; border-radius: var(--radius-xl); padding: 2.5rem; text-align: center; border: 1px solid var(--primary-100); box-shadow: var(--shadow-sm);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📬</div>
          <h3 style="font-size: 1.25rem; font-weight: 700; color: #0f172a;">Track Your Submitted Applications</h3>
          <p style="color: #64748b; font-size: 0.95rem; margin: 0.5rem auto 1.5rem; max-width: 500px;">
            Sign in to automatically see your job applications, or enter the email address you used when applying.
          </p>
          <div style="display: flex; justify-content: center; gap: 0.5rem; max-width: 420px; margin: 0 auto;">
            <input type="email" id="track-by-email-input" class="form-control" placeholder="Enter your application email...">
            <button class="btn btn-primary" onclick="renderMyApplications()">Search</button>
          </div>
          <div style="margin-top: 1.5rem; font-size: 0.85rem; color: #64748b;">
            Already have an account? <a href="javascript:void(0)" onclick="quickDemoLogin('candidate')" style="font-weight: 600;">Log in as Demo Candidate</a>
          </div>
        </div>
      `;
      return;
    }

    const res = await API.getApplications(params);
    const apps = res.applications || [];

    if (apps.length === 0) {
      container.innerHTML = `
        <div style="background: white; border-radius: var(--radius-xl); padding: 3rem 1.5rem; text-align: center; border: 1px solid var(--primary-100);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📂</div>
          <h3 style="font-size: 1.2rem; font-weight: 700; color: #0f172a;">No applications found</h3>
          <p style="color: #64748b; font-size: 0.9rem; margin-top: 0.35rem;">You haven't submitted any job applications under this account yet.</p>
          <button class="btn btn-primary" style="margin-top: 1.25rem;" onclick="switchTab('jobs')">Explore Open Positions</button>
        </div>
      `;
      return;
    }

    container.innerHTML = apps.map(app => `
      <div style="background: white; border-radius: var(--radius-xl); border: 1px solid var(--primary-100); padding: 1.5rem; margin-bottom: 1.25rem; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
              <span class="badge badge-sky">${escapeHtml(app.job_department)}</span>
              <span class="badge badge-slate">📍 ${escapeHtml(app.job_location)}</span>
            </div>
            <h3 style="font-size: 1.25rem; font-weight: 700; color: #0f172a;">${escapeHtml(app.job_title)}</h3>
            <div style="font-size: 0.825rem; color: #64748b; margin-top: 0.2rem;">Submitted on ${new Date(app.created_at).toLocaleDateString()} (${formatRelativeTime(app.created_at)})</div>
          </div>
          <div>
            ${getStatusBadge(app.status)}
          </div>
        </div>

        <!-- Stage progression bar -->
        <div style="background: #f8fafc; border-radius: var(--radius-lg); padding: 1rem; margin: 1rem 0; border: 1px solid #e2e8f0;">
          <div style="font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Hiring Pipeline Progress</div>
          <div style="display: flex; align-items: center; justify-content: space-between; position: relative;">
            ${renderProgressStep('Applied', 'applied', app.status, 1)}
            <div style="flex: 1; height: 3px; background: ${isStepReached('screening', app.status) ? '#38bdf8' : '#e2e8f0'}; margin: 0 4px;"></div>
            ${renderProgressStep('Screening', 'screening', app.status, 2)}
            <div style="flex: 1; height: 3px; background: ${isStepReached('interview', app.status) ? '#38bdf8' : '#e2e8f0'}; margin: 0 4px;"></div>
            ${renderProgressStep('Interview', 'interview', app.status, 3)}
            <div style="flex: 1; height: 3px; background: ${isStepReached('offer', app.status) ? '#38bdf8' : '#e2e8f0'}; margin: 0 4px;"></div>
            ${renderProgressStep(app.status === 'rejected' ? 'Declined' : 'Offer / Hired', app.status === 'rejected' ? 'rejected' : 'offer', app.status, 4)}
          </div>
        </div>

        ${app.admin_notes ? `
          <div style="background: #f0f9ff; border-radius: var(--radius-md); padding: 0.85rem 1rem; border-left: 3px solid #0284c7; margin-top: 0.75rem;">
            <div style="font-size: 0.8rem; font-weight: 700; color: #0369a1; margin-bottom: 0.2rem;">Hiring Team Update:</div>
            <div style="font-size: 0.9rem; color: #1e293b;">${escapeHtml(app.admin_notes)}</div>
          </div>
        ` : ''}

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding-top: 0.85rem; border-top: 1px solid #f1f5f9; font-size: 0.85rem;">
          <div style="color: #64748b;">Applicant: <strong style="color: #334155;">${escapeHtml(app.applicant_name)}</strong> (${escapeHtml(app.applicant_email)})</div>
          ${app.resume_filepath ? `
            <a href="/${app.resume_filepath}" target="_blank" class="btn btn-outline btn-sm">📄 View Submitted Resume</a>
          ` : ''}
        </div>
      </div>
    `).join('');

  } catch (err) {
    container.innerHTML = `<div style="color: #ef4444; padding: 2rem;">Error: ${err.message}</div>`;
  }
}

function isStepReached(targetStep, currentStatus) {
  const order = ['applied', 'screening', 'interview', 'offer', 'hired'];
  const curIdx = order.indexOf(currentStatus);
  const targetIdx = order.indexOf(targetStep);
  return curIdx >= targetIdx && curIdx !== -1;
}

function renderProgressStep(label, stepKey, currentStatus, stepNum) {
  const reached = isStepReached(stepKey, currentStatus);
  const isCurrent = currentStatus === stepKey;
  const isRejected = currentStatus === 'rejected';

  const bgColor = isCurrent 
    ? '#0284c7' 
    : reached 
      ? '#38bdf8' 
      : isRejected && stepKey === 'rejected' 
        ? '#ef4444' 
        : '#e2e8f0';

  const textColor = (reached || isCurrent || (isRejected && stepKey === 'rejected')) ? 'white' : '#64748b';

  return `
    <div style="display: flex; flex-direction: column; align-items: center; z-index: 2;">
      <div style="width: 26px; height: 26px; border-radius: 50%; background: ${bgColor}; color: ${textColor}; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        ${reached ? '✓' : stepNum}
      </div>
      <div style="font-size: 0.75rem; font-weight: ${isCurrent ? '700' : '500'}; color: ${isCurrent ? '#0369a1' : '#64748b'}; margin-top: 0.35rem; white-space: nowrap;">
        ${label}
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// ADMIN VIEWS: DASHBOARD, JOBS MANAGEMENT, CANDIDATE TRACKER
// -------------------------------------------------------------
async function renderAdminDashboard() {
  try {
    const res = await API.getAdminStats();
    const stats = res.stats;
    STATE.adminStats = stats;

    document.getElementById('stat-total-jobs').innerText = stats.total_jobs;
    document.getElementById('stat-open-jobs').innerText = stats.open_jobs;
    document.getElementById('stat-total-candidates').innerText = stats.total_applications;
    document.getElementById('stat-interviews').innerText = (stats.status_breakdown.interview || 0) + (stats.status_breakdown.screening || 0);
    document.getElementById('stat-hired').innerText = stats.status_breakdown.hired || 0;

    // Render Recent Applications table
    const recentTable = document.getElementById('admin-recent-applications-body');
    if (recentTable) {
      if (stats.recent_applications.length === 0) {
        recentTable.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #64748b; padding: 2rem;">No candidate applications yet.</td></tr>`;
      } else {
        recentTable.innerHTML = stats.recent_applications.map(app => `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 0.85rem 1rem; font-weight: 600; color: #0f172a;">${escapeHtml(app.applicant_name)}</td>
            <td style="padding: 0.85rem 1rem; color: #64748b;">${escapeHtml(app.applicant_email)}</td>
            <td style="padding: 0.85rem 1rem; color: #0284c7; font-weight: 500;">${escapeHtml(app.job_title)}</td>
            <td style="padding: 0.85rem 1rem;">${getStatusBadge(app.status)}</td>
            <td style="padding: 0.85rem 1rem; text-align: right;">
              <button class="btn btn-outline btn-sm" onclick="openCandidateReviewModal(${app.id})">Review</button>
            </td>
          </tr>
        `).join('');
      }
    }
  } catch (err) {
    console.error("Dashboard stats error:", err);
  }
}

// Admin Jobs Management Tab
async function renderAdminJobs() {
  const tableBody = document.getElementById('admin-jobs-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #0284c7;">Loading job openings...</td></tr>`;

  try {
    const res = await API.getJobs({ is_admin: 'true', status: 'all' });
    const jobs = res.jobs || [];

    if (jobs.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 3rem; color: #64748b;">
            <div>No job openings posted yet. Click <strong>"+ Post a Job"</strong> to publish your first opening!</div>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = jobs.map(j => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 1rem;">
          <div style="font-weight: 700; color: #0f172a; font-size: 0.95rem;">${escapeHtml(j.title)}</div>
          <div style="font-size: 0.8rem; color: #64748b;">${escapeHtml(j.salary_range || 'Salary not listed')}</div>
        </td>
        <td style="padding: 1rem;"><span class="badge badge-sky">${escapeHtml(j.department)}</span></td>
        <td style="padding: 1rem; font-size: 0.9rem; color: #334155;">${escapeHtml(j.location)}</td>
        <td style="padding: 1rem; font-size: 0.85rem; color: #475569;">${escapeHtml(j.job_type)}</td>
        <td style="padding: 1rem;">
          <a href="javascript:void(0)" onclick="filterPipelineByJob(${j.id})" class="badge badge-indigo" style="cursor: pointer; text-decoration: none;">
            👥 ${j.application_count} Candidates
          </a>
        </td>
        <td style="padding: 1rem;">
          <button class="badge ${j.status === 'open' ? 'badge-emerald' : 'badge-slate'}" style="cursor: pointer; border: none;" onclick="toggleJobStatus(${j.id}, '${j.status === 'open' ? 'closed' : 'open'}')">
            ${j.status === 'open' ? '● Open' : '○ Closed'}
          </button>
        </td>
        <td style="padding: 1rem; text-align: right;">
          <div style="display: inline-flex; gap: 0.4rem;">
            <button class="btn btn-outline btn-sm" onclick="openJobModal(${j.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="confirmDeleteJob(${j.id}, '${escapeHtml(j.title)}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="7" style="color: #ef4444; padding: 2rem;">Error: ${err.message}</td></tr>`;
  }
}

async function toggleJobStatus(jobId, newStatus) {
  try {
    await API.toggleJobStatus(jobId, newStatus);
    showToast(`Job status set to ${newStatus}`, 'success');
    renderAdminJobs();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function confirmDeleteJob(jobId, title) {
  if (confirm(`Are you sure you want to delete the job opening "${title}"? All associated applications will also be removed.`)) {
    try {
      await API.deleteJob(jobId);
      showToast("Job opening deleted successfully", 'success');
      renderAdminJobs();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
}

// Admin: Post / Edit Job Modal
async function openJobModal(jobId = null) {
  const modal = document.getElementById('job-form-modal');
  const titleEl = document.getElementById('job-form-modal-title');
  const form = document.getElementById('job-create-edit-form');
  if (!modal || !form) return;

  form.reset();
  document.getElementById('job-form-id').value = jobId || '';

  if (jobId) {
    titleEl.innerText = "Edit Job Opening";
    try {
      const res = await API.getJob(jobId);
      const job = res.job;
      document.getElementById('job-form-title').value = job.title;
      document.getElementById('job-form-department').value = job.department;
      document.getElementById('job-form-location').value = job.location;
      document.getElementById('job-form-type').value = job.job_type;
      document.getElementById('job-form-exp').value = job.experience_level;
      document.getElementById('job-form-salary').value = job.salary_range || '';
      document.getElementById('job-form-desc').value = job.description;
      document.getElementById('job-form-reqs').value = job.requirements || '';
      document.getElementById('job-form-benefits').value = job.benefits || '';
      document.getElementById('job-form-status').value = job.status || 'open';
    } catch (err) {
      showToast(err.message, 'error');
      return;
    }
  } else {
    titleEl.innerText = "Post a New Job Opening";
    document.getElementById('job-form-status').value = 'open';
  }

  modal.classList.add('open');
}

// Quick Templates for Admin Job Posting
function applyJobTemplate(templateType) {
  const templates = {
    frontend: {
      title: "Senior React / TypeScript Engineer",
      department: "Engineering",
      location: "Remote (Global)",
      job_type: "Full-time",
      experience_level: "Senior Level",
      salary: "$125,000 - $155,000",
      desc: "We are expanding our product engineering squad. You will craft responsive user workflows, maintain component design systems, and partner with backend engineers.",
      reqs: "• 4+ years of modern JavaScript/TypeScript and React\n• Deep understanding of Web performance and state architectures\n• Excellent communication skills in async environments",
      benefits: "• Comprehensive health & dental coverage\n• $2,000 annual learning & equipment budget\n• Flexible hours and unlimited PTO"
    },
    backend: {
      title: "Backend & Systems Engineer (Python/Go)",
      department: "Engineering",
      location: "Hybrid (New York, NY)",
      job_type: "Full-time",
      experience_level: "Mid Level",
      salary: "$130,000 - $160,000",
      desc: "Build highly reliable APIs, orchestrate data pipelines, and design relational databases that power our core job tracking infrastructure.",
      reqs: "• 3+ years writing robust backend services in Python, Go, or Node\n• Experience with SQL schemas, indexing, and Redis caching\n• Familiarity with Docker and RESTful API conventions",
      benefits: "• 401(k) 5% match\n• Top-tier medical & dental\n• Commuter benefits and catered lunches"
    },
    designer: {
      title: "Senior Product Designer (UI/UX)",
      department: "Design",
      location: "Remote",
      job_type: "Full-time",
      experience_level: "Senior Level",
      salary: "$115,000 - $145,000",
      desc: "Shape the visual and interaction design of our software products. You will turn customer pain points into elegant, light-blue, delightful user journeys.",
      reqs: "• 5+ years designing responsive web applications\n• Expert mastery of Figma, prototyping, and design systems\n• Proven ability to run user testing sessions and distill feedback",
      benefits: "• Full health coverage\n• Home office stipend\n• Annual design conference travel allowance"
    },
    devops: {
      title: "Cloud & DevOps Specialist (AWS/Kubernetes)",
      department: "Infrastructure",
      location: "Remote",
      job_type: "Full-time",
      experience_level: "Senior Level",
      salary: "$140,000 - $170,000",
      desc: "Architect cloud infrastructure, maintain zero-downtime CI/CD deployment pipelines, and optimize our cloud cost and security posture.",
      reqs: "• Strong experience with AWS, Terraform, and Kubernetes\n• Proven experience implementing CI/CD with GitHub Actions\n• Observability monitoring with Datadog/Prometheus",
      benefits: "• 100% remote\n• Competitive equity grant\n• Premium wellness allowance"
    }
  };

  const t = templates[templateType];
  if (!t) return;

  document.getElementById('job-form-title').value = t.title;
  document.getElementById('job-form-department').value = t.department;
  document.getElementById('job-form-location').value = t.location;
  document.getElementById('job-form-type').value = t.job_type;
  document.getElementById('job-form-exp').value = t.experience_level;
  document.getElementById('job-form-salary').value = t.salary;
  document.getElementById('job-form-desc').value = t.desc;
  document.getElementById('job-form-reqs').value = t.reqs;
  document.getElementById('job-form-benefits').value = t.benefits;

  showToast(`Loaded "${t.title}" template!`, 'info');
}

async function handleJobFormSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  const jobId = document.getElementById('job-form-id').value;
  const payload = {
    title: document.getElementById('job-form-title').value.trim(),
    department: document.getElementById('job-form-department').value.trim(),
    location: document.getElementById('job-form-location').value.trim(),
    job_type: document.getElementById('job-form-type').value,
    experience_level: document.getElementById('job-form-exp').value,
    salary_range: document.getElementById('job-form-salary').value.trim(),
    description: document.getElementById('job-form-desc').value.trim(),
    requirements: document.getElementById('job-form-reqs').value.trim(),
    benefits: document.getElementById('job-form-benefits').value.trim(),
    status: document.getElementById('job-form-status').value
  };

  if (!payload.title || !payload.description) {
    showToast("Title and Description are required", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerText = "Saving...";

  try {
    if (jobId) {
      await API.updateJob(jobId, payload);
      showToast("Job opening updated successfully!", "success");
    } else {
      await API.createJob(payload);
      showToast("Job opening published successfully!", "success");
    }
    closeAllModals();
    await loadInitialData();
    renderAdminJobs();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = "Save & Publish Opening";
  }
}

// -------------------------------------------------------------
// ADMIN CANDIDATE PIPELINE / TRACKER
// -------------------------------------------------------------
function filterPipelineByJob(jobId) {
  STATE.pipelineFilter.job_id = jobId;
  switchTab('admin-pipeline');
}

async function renderAdminPipeline() {
  const container = document.getElementById('admin-pipeline-cards');
  const jobFilterSelect = document.getElementById('pipeline-filter-job');
  if (!container) return;

  // Populate Jobs dropdown for pipeline filter
  if (jobFilterSelect && STATE.jobs.length > 0) {
    jobFilterSelect.innerHTML = '<option value="all">All Job Openings</option>' + 
      STATE.jobs.map(j => `<option value="${j.id}" ${String(STATE.pipelineFilter.job_id) === String(j.id) ? 'selected' : ''}>${escapeHtml(j.title)}</option>`).join('');
  }

  try {
    const params = {};
    if (STATE.pipelineFilter.job_id && STATE.pipelineFilter.job_id !== 'all') {
      params.job_id = STATE.pipelineFilter.job_id;
    }
    if (STATE.pipelineFilter.status && STATE.pipelineFilter.status !== 'all') {
      params.status = STATE.pipelineFilter.status;
    }
    if (STATE.pipelineFilter.search) {
      params.search = STATE.pipelineFilter.search;
    }

    const res = await API.getApplications(params);
    STATE.applications = res.applications || [];

    // Stages columns: applied, screening, interview, offer, hired
    const stages = [
      { key: 'applied', label: 'Applied', color: '#0ea5e9' },
      { key: 'screening', label: 'Screening', color: '#f59e0b' },
      { key: 'interview', label: 'Interview', color: '#6366f1' },
      { key: 'offer', label: 'Offer', color: '#10b981' },
      { key: 'hired', label: 'Hired', color: '#059669' }
    ];

    container.innerHTML = stages.map(st => {
      const stageApps = STATE.applications.filter(a => a.status === st.key);
      return `
        <div class="pipeline-col">
          <div class="pipeline-col-header">
            <div class="pipeline-col-title">
              <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${st.color};"></span>
              ${st.label}
            </div>
            <span class="pipeline-col-count">${stageApps.length}</span>
          </div>
          <div class="pipeline-cards-list">
            ${stageApps.length === 0 ? `
              <div style="text-align: center; color: #94a3b8; font-size: 0.825rem; padding: 2rem 0.5rem;">
                No candidates
              </div>
            ` : stageApps.map(app => `
              <div class="pipeline-card" onclick="openCandidateReviewModal(${app.id})">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.35rem;">
                  <strong style="color: #0f172a; font-size: 0.95rem;">${escapeHtml(app.applicant_name)}</strong>
                  ${renderStarRating(app.rating || 0)}
                </div>
                <div style="font-size: 0.8rem; color: #0284c7; font-weight: 500; margin-bottom: 0.5rem;">${escapeHtml(app.job_title)}</div>
                
                ${app.skills ? `
                  <div style="display: flex; flex-wrap: wrap; gap: 3px; margin-bottom: 0.6rem;">
                    ${app.skills.split(',').slice(0, 3).map(sk => `<span class="badge badge-sky" style="font-size: 0.65rem; padding: 0.15rem 0.45rem;">${escapeHtml(sk.trim())}</span>`).join('')}
                  </div>
                ` : ''}

                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 0.5rem; font-size: 0.75rem; color: #64748b;">
                  <span>${formatRelativeTime(app.created_at)}</span>
                  <span style="color: #0ea5e9; font-weight: 600;">View Profile →</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    container.innerHTML = `<div style="color: #ef4444; padding: 2rem;">Error: ${err.message}</div>`;
  }
}

function renderStarRating(rating) {
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    stars += `<span style="color: ${i <= rating ? '#f59e0b' : '#cbd5e1'}; font-size: 0.85rem;">★</span>`;
  }
  return `<div>${stars}</div>`;
}

// Candidate Review Drawer / Modal
async function openCandidateReviewModal(appId) {
  const modal = document.getElementById('candidate-review-modal');
  const body = document.getElementById('candidate-review-body');
  if (!modal || !body) return;

  try {
    const res = await API.getApplication(appId);
    const app = res.application;
    STATE.selectedApplication = app;

    body.innerHTML = `
      <div style="margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #e2e8f0;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 800; color: #0f172a; margin-bottom: 0.25rem;">${escapeHtml(app.applicant_name)}</h2>
            <div style="font-size: 0.95rem; color: #0284c7; font-weight: 600;">Applied for: ${escapeHtml(app.job_title)}</div>
            <div style="display: flex; align-items: center; gap: 1rem; color: #64748b; font-size: 0.85rem; margin-top: 0.5rem;">
              <span>✉️ <a href="mailto:${escapeHtml(app.applicant_email)}">${escapeHtml(app.applicant_email)}</a></span>
              ${app.applicant_phone ? `<span>📞 ${escapeHtml(app.applicant_phone)}</span>` : ''}
              <span>📅 ${new Date(app.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div>
            ${getStatusBadge(app.status)}
          </div>
        </div>
      </div>

      <!-- Links & Resume -->
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.25rem;">
        ${app.resume_filepath ? `
          <a href="/${app.resume_filepath}" target="_blank" class="btn btn-secondary btn-sm">
            📄 View Resume File (${escapeHtml(app.resume_filename || 'PDF')})
          </a>
        ` : ''}
        ${app.linkedin_url ? `
          <a href="${escapeHtml(app.linkedin_url)}" target="_blank" class="btn btn-outline btn-sm">LinkedIn Profile ↗</a>
        ` : ''}
        ${app.portfolio_url ? `
          <a href="${escapeHtml(app.portfolio_url)}" target="_blank" class="btn btn-outline btn-sm">Portfolio ↗</a>
        ` : ''}
      </div>

      <!-- Experience & Skills -->
      <div style="background: #f8fafc; border-radius: var(--radius-lg); padding: 1rem; margin-bottom: 1.25rem; border: 1px solid #e2e8f0;">
        <div style="font-size: 0.85rem; font-weight: 700; color: #334155; margin-bottom: 0.5rem;">Experience & Qualifications:</div>
        <div style="font-size: 0.9rem; color: #475569; margin-bottom: 0.5rem;">Experience: <strong>${escapeHtml(app.experience_years || 'Not specified')}</strong></div>
        ${app.skills ? `
          <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
            ${app.skills.split(',').map(s => `<span class="badge badge-sky">${escapeHtml(s.trim())}</span>`).join('')}
          </div>
        ` : ''}
      </div>

      <!-- Cover Letter -->
      ${app.cover_letter ? `
        <div style="margin-bottom: 1.5rem;">
          <h4 style="font-size: 0.95rem; font-weight: 700; color: #1e293b; margin-bottom: 0.4rem;">Cover Letter / Candidate Statement</h4>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: var(--radius-md); padding: 1rem; font-size: 0.9rem; color: #334155; line-height: 1.6; white-space: pre-line;">${escapeHtml(app.cover_letter)}</div>
        </div>
      ` : ''}

      <!-- Admin Actions: Status & Notes -->
      <div style="background: #f0f9ff; border-radius: var(--radius-xl); padding: 1.25rem; border: 1px solid #bae6fd; margin-top: 1rem;">
        <h4 style="font-size: 0.95rem; font-weight: 700; color: #0369a1; margin-bottom: 0.85rem;">Recruiter Review & Actions</h4>
        
        <div class="form-row" style="margin-bottom: 1rem;">
          <div>
            <label class="form-label">Application Status</label>
            <select id="review-status-select" class="form-control" onchange="quickUpdateAppStatus(${app.id}, this.value)">
              <option value="applied" ${app.status === 'applied' ? 'selected' : ''}>Applied (New)</option>
              <option value="screening" ${app.status === 'screening' ? 'selected' : ''}>Screening</option>
              <option value="interview" ${app.status === 'interview' ? 'selected' : ''}>Interview Scheduled</option>
              <option value="offer" ${app.status === 'offer' ? 'selected' : ''}>Offer Extended</option>
              <option value="hired" ${app.status === 'hired' ? 'selected' : ''}>Hired</option>
              <option value="rejected" ${app.status === 'rejected' ? 'selected' : ''}>Rejected / Not Selected</option>
            </select>
          </div>

          <div>
            <label class="form-label">Candidate Score</label>
            <div id="review-star-rating" class="star-rating" style="padding-top: 0.4rem;">
              ${[1, 2, 3, 4, 5].map(st => `
                <span class="star ${st <= (app.rating || 0) ? 'filled' : ''}" onclick="setReviewRating(${st})" data-val="${st}">★</span>
              `).join('')}
            </div>
            <input type="hidden" id="review-rating-val" value="${app.rating || 0}">
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 1rem;">
          <label class="form-label">Internal Recruiter Notes / Interview Feedback</label>
          <textarea id="review-notes-textarea" class="form-control" placeholder="Add interview thoughts, salary expectations, next steps...">${escapeHtml(app.admin_notes || '')}</textarea>
        </div>

        <button class="btn btn-primary" onclick="saveCandidateReview(${app.id})">Save Review Notes</button>
      </div>
    `;

    modal.classList.add('open');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function setReviewRating(starVal) {
  document.getElementById('review-rating-val').value = starVal;
  const stars = document.querySelectorAll('#review-star-rating .star');
  stars.forEach((st, idx) => {
    if (idx < starVal) {
      st.classList.add('filled');
    } else {
      st.classList.remove('filled');
    }
  });
}

async function quickUpdateAppStatus(appId, newStatus) {
  try {
    await API.updateApplicationStatus(appId, newStatus);
    showToast(`Status updated to "${newStatus}"`, 'success');
    renderAdminPipeline();
    renderAdminDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function saveCandidateReview(appId) {
  const notes = document.getElementById('review-notes-textarea').value.trim();
  const rating = parseInt(document.getElementById('review-rating-val').value || 0);

  try {
    await API.updateApplicationReview(appId, notes, rating);
    showToast("Review notes and score saved!", "success");
    renderAdminPipeline();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// Export Candidates to CSV
function exportCandidatesCSV() {
  if (!STATE.applications || STATE.applications.length === 0) {
    showToast("No candidate applications to export", "info");
    return;
  }

  const headers = ["ID", "Candidate Name", "Email", "Phone", "Job Title", "Department", "Status", "Experience", "Skills", "Rating", "Created At"];
  const rows = STATE.applications.map(a => [
    a.id,
    `"${(a.applicant_name || '').replace(/"/g, '""')}"`,
    `"${(a.applicant_email || '').replace(/"/g, '""')}"`,
    `"${(a.applicant_phone || '').replace(/"/g, '""')}"`,
    `"${(a.job_title || '').replace(/"/g, '""')}"`,
    `"${(a.job_department || '').replace(/"/g, '""')}"`,
    `"${a.status}"`,
    `"${(a.experience_years || '').replace(/"/g, '""')}"`,
    `"${(a.skills || '').replace(/"/g, '""')}"`,
    a.rating || 0,
    a.created_at
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `JobTrack_Candidates_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast("Candidate CSV report downloaded!", "success");
}

// Login Modal
function openLoginModal(defaultRole = 'candidate') {
  const modal = document.getElementById('login-modal');
  if (!modal) return;
  modal.classList.add('open');
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const submitBtn = e.target.querySelector('button[type="submit"]');

  submitBtn.disabled = true;
  submitBtn.innerText = "Signing in...";

  try {
    const res = await API.login(email, password);
    STATE.currentUser = res.user;
    STATE.activeRole = res.user.role === 'admin' ? 'admin' : 'candidate';
    STATE.currentTab = res.user.role === 'admin' ? 'admin-dashboard' : 'jobs';
    closeAllModals();
    showToast(res.message || "Logged in successfully!", 'success');
    renderApp();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = "Sign In";
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const fullName = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const submitBtn = e.target.querySelector('button[type="submit"]');

  submitBtn.disabled = true;
  submitBtn.innerText = "Creating Account...";

  try {
    const res = await API.register({
      full_name: fullName,
      email: email,
      password: password,
      phone: phone,
      role: 'user'
    });
    STATE.currentUser = res.user;
    STATE.activeRole = 'candidate';
    STATE.currentTab = 'jobs';
    closeAllModals();
    showToast(res.message || "Account created!", 'success');
    renderApp();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = "Create Candidate Account";
  }
}

// Seed Reset
async function handleResetDemoData() {
  if (confirm("Reset demo database with fresh sample jobs, candidates, and applications?")) {
    try {
      await API.resetDemoData();
      showToast("Demo database reset successfully!", "success");
      await loadInitialData();
      renderApp();
    } catch (err) {
      showToast(err.message, "error");
    }
  }
}

