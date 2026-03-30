const API_URL = window.location.port === '8080'
    ? window.location.origin
    : 'http://localhost:8080';

// State
let currentSearchPage = 0;
let lastDetailSource = 'overview'; // track where case-detail was opened from

// Initialize UI on load
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwt');
    const role = localStorage.getItem('role');

    if (token && role) {
        showDashboard();
    } else {
        localStorage.removeItem('jwt');
        localStorage.removeItem('role');
        localStorage.removeItem('username');
        showScreen('home');
    }
});

function showLoader(show) {
    document.getElementById('loader').style.display = show ? 'flex' : 'none';
}

function updateMessage(id, msg, isError = false) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerText = msg;
    el.className = `message ${isError ? 'error-msg' : 'success-msg'}`;
    setTimeout(() => el.innerText = '', 5000);
}

async function readErrorMessage(res, fallback) {
    const text = await res.text();
    if (!text) return fallback;

    try {
        const json = JSON.parse(text);
        return json.message || fallback;
    } catch (err) {
        return text;
    }
}

async function readJsonSafely(res) {
    const text = await res.text();
    if (!text) return null;

    try {
        return JSON.parse(text);
    } catch (err) {
        return null;
    }
}

// ----- TOP LEVEL SCREEN MANAGEMENT ----- //
function showScreen(screenId) {
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('dashboard-container').style.display = 'none';

    document.getElementById('login-box').style.display = 'none';
    document.getElementById('register-box').style.display = 'none';
    document.getElementById('logout-success-box').style.display = 'none';

    const navAuth = document.getElementById('nav-auth-buttons');

    if (screenId === 'home') screenId = 'login';

    if (screenId === 'login') {
        document.getElementById('login-box').style.display = 'block';
        navAuth.style.display = 'flex';
    } else if (screenId === 'register') {
        document.getElementById('register-box').style.display = 'block';
        navAuth.style.display = 'flex';
    } else if (screenId === 'logout') {
        document.getElementById('logout-success-box').style.display = 'block';
        navAuth.style.display = 'flex';
    } else if (screenId === 'dashboard') {
        showDashboard();
    }
}

// ----- AUTHENTICATION API ----- //
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader(true);

    const payload = {
        username: document.getElementById('reg-username').value,
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value,
        role: document.getElementById('reg-role').value
    };

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        showLoader(false);

        if (!res.ok) {
            const message = await readErrorMessage(res, 'Registration failed.');
            updateMessage('reg-error', message, true);
            return;
        }

        updateMessage('reg-message', 'Registration successful! Please login.', false);
        setTimeout(() => showScreen('login'), 2000);
    } catch (err) {
        showLoader(false);
        updateMessage('reg-error', 'Server error. Is the backend running?', true);
    }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader(true);

    const payload = {
        username: document.getElementById('login-username').value,
        password: document.getElementById('login-password').value
    };

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            throw new Error(await readErrorMessage(res, 'Invalid credentials'));
        }

        const data = await res.json();
        localStorage.setItem('jwt', data.token);
        localStorage.setItem('username', data.username);
        localStorage.setItem('role', data.role);

        showLoader(false);
        showDashboard();
    } catch (err) {
        showLoader(false);
        updateMessage('login-error', err.message || 'Login failed. Check credentials.', true);
    }
});

function logout() {
    localStorage.clear();
    document.getElementById('cases-tbody').innerHTML = '';
    showScreen('logout');
}

// ----- DASHBOARD LAYOUT & ROUTING ----- //
function showDashboard() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('dashboard-container').style.display = 'flex';
    document.getElementById('nav-auth-buttons').style.display = 'none';

    setupRBACUI();
    switchDashboardView('overview');
}

function setupRBACUI() {
    const role = localStorage.getItem('role') || 'Unknown User';
    const username = localStorage.getItem('username') || '';

    document.getElementById('user-display-name').innerText = username;
    document.getElementById('user-role-name').innerText = role;

    const adminUserMgmt = document.getElementById('admin-user-mgmt');
    const judgeCaseActions = document.getElementById('judge-case-actions');
    const navFile = document.getElementById('nav-lawyer-file');
    const navAddCase = document.getElementById('nav-add-case');
    const navManageCases = document.getElementById('nav-manage-cases');
    const scopeAllLabel = document.getElementById('scope-all-label');

    adminUserMgmt.style.display = role === 'ADMIN' ? 'block' : 'none';
    judgeCaseActions.style.display = role === 'JUDGE' ? 'block' : 'none';

    if (role === 'CLIENT' || role === 'LAWYER' || role === 'ADMIN') {
        navFile.style.display = 'flex';
        navAddCase.style.display = 'list-item';
        navFile.classList.remove('disabled-menu');
        navAddCase.classList.remove('disabled-menu');
    } else {
        navFile.style.display = 'none';
        navAddCase.style.display = 'none';
    }

    if (navManageCases) {
        navManageCases.style.display = 'list-item';
    }

    // Show "All Cases" scope only for ADMIN/JUDGE
    if (scopeAllLabel) {
        const showAll = role === 'ADMIN' || role === 'JUDGE';
        scopeAllLabel.style.display = showAll ? '' : 'none';
        document.getElementById('scope-all').style.display = showAll ? '' : 'none';
    }

    loadInitialData();
}

function switchDashboardView(viewId) {
    document.querySelectorAll('.dash-view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));

    const viewEl = document.getElementById(`view-${viewId}`);
    if (viewEl) viewEl.classList.add('active');

    const menus = Array.from(document.querySelectorAll('.menu-item'));
    for (let m of menus) {
        if (m.getAttribute('onclick') && m.getAttribute('onclick').includes(viewId)) {
            m.classList.add('active');
            break;
        }
    }
}

// Access Denied Modal
function showAccessDeniedModal() {
    document.getElementById('access-denied-modal').style.display = 'flex';
}

function closeAccessDeniedModal() {
    document.getElementById('access-denied-modal').style.display = 'none';
    switchDashboardView('overview');
}


// ----- API FETCH LAYER WITH ERROR HANDLING ----- //
async function authFetch(url, options = {}) {
    const token = localStorage.getItem('jwt');
    const headers = { ...options.headers };

    // Only set Content-Type for non-FormData requests
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { ...options, headers });

    if (res.status === 403) {
        showAccessDeniedModal();
        throw new Error("403_FORBIDDEN");
    } else if (res.status === 401) {
        logout();
        throw new Error("401_UNAUTHORIZED");
    }

    return res;
}


// =============================================
//  STATUS CHIP HELPER
// =============================================
function renderStatusChip(status) {
    const s = (status || 'PENDING').toUpperCase();
    const cls = 'status-' + s.toLowerCase().replace(/ /g, '_');
    return `<span class="status-chip ${cls}">${s}</span>`;
}


// =============================================
//  FORMAT HELPERS
// =============================================
function formatCaseDate(dateValue) {
    if (!dateValue) return 'N/A';
    const parsedDate = new Date(dateValue);
    return Number.isNaN(parsedDate.getTime()) ? dateValue : parsedDate.toLocaleDateString();
}

function formatInstant(instant) {
    if (!instant) return 'N/A';
    const d = new Date(instant);
    return Number.isNaN(d.getTime()) ? instant : d.toLocaleString();
}

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
    return `${size.toFixed(1)} ${units[i]}`;
}


// =============================================
//  DASHBOARD OVERVIEW – DATA POPULATION
// =============================================
async function loadInitialData() {
    const role = localStorage.getItem('role');
    const tbody = document.getElementById('cases-tbody');
    tbody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';

    try {
        let res;
        let data;
        if (role === 'ADMIN') {
            res = await authFetch(`${API_URL}/cases/all`);
            data = await res.json();
        } else {
            res = await authFetch(`${API_URL}/cases/my`);
            data = await res.json();
        }

        populateTable(data, tbody);
        updateStatCards(data);
    } catch (e) {
        if (e.message !== "403_FORBIDDEN" && e.message !== "401_UNAUTHORIZED") {
            tbody.innerHTML = `<tr><td colspan="6">Failed to load data.</td></tr>`;
        }
    }
}

function updateStatCards(cases) {
    const total = cases ? cases.length : 0;
    const pending = cases ? cases.filter(c =>
        ['FILED', 'PENDING', 'IN_REVIEW'].includes((c.status || '').toUpperCase())
    ).length : 0;
    const closed = cases ? cases.filter(c =>
        (c.status || '').toUpperCase() === 'CLOSED'
    ).length : 0;

    const elTotal = document.getElementById('stat-total');
    const elPending = document.getElementById('stat-pending');
    const elClosed = document.getElementById('stat-closed');

    if (elTotal) elTotal.textContent = total.toLocaleString();
    if (elPending) elPending.textContent = pending.toLocaleString();
    if (elClosed) elClosed.textContent = closed.toLocaleString();
}

function populateTable(cases, tbody) {
    if (!cases || cases.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No cases found.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    cases.forEach(c => {
        const tr = document.createElement('tr');
        tr.onclick = () => showCaseDetail(c.caseNumber, 'overview');

        const values = [
            c.caseNumber || 'N/A',
            c.title || 'Untitled',
            c.clientUsername || '—',
            c.judgeUsername || 'Unassigned',
            formatCaseDate(c.filedDate),
        ];

        values.forEach(value => {
            const td = document.createElement('td');
            td.textContent = value;
            tr.appendChild(td);
        });

        // Status chip column
        const statusTd = document.createElement('td');
        statusTd.innerHTML = renderStatusChip(c.status);
        tr.appendChild(statusTd);

        tbody.appendChild(tr);
    });
}


// =============================================
//  CASE SEARCH (GET /cases/search)
// =============================================
async function searchCases(page) {
    if (page === undefined || page === null) page = 0;
    if (page < 0) page = 0;

    const scope = document.querySelector('input[name="search-scope"]:checked')?.value || 'my';
    const size = parseInt(document.getElementById('search-page-size')?.value || '10');
    const query = document.getElementById('search-query')?.value.trim() || '';
    const status = document.getElementById('search-status')?.value || '';
    const client = document.getElementById('search-client')?.value.trim() || '';
    const judge = document.getElementById('search-judge')?.value.trim() || '';
    const lawyer = document.getElementById('search-lawyer')?.value.trim() || '';
    const filedDate = document.getElementById('search-filed-date')?.value || '';
    const filedFrom = document.getElementById('search-filed-from')?.value || '';
    const filedTo = document.getElementById('search-filed-to')?.value || '';

    const params = new URLSearchParams();
    params.set('scope', scope);
    params.set('page', page);
    params.set('size', size);
    if (query) params.set('query', query);
    if (status) params.set('status', status);
    if (client) params.set('clientUsername', client);
    if (judge) params.set('judgeUsername', judge);
    if (lawyer) params.set('lawyerUsername', lawyer);
    if (filedDate) params.set('filedDate', filedDate);
    if (filedFrom) params.set('filedFrom', filedFrom);
    if (filedTo) params.set('filedTo', filedTo);

    const tbody = document.getElementById('search-results-tbody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Searching...</td></tr>';

    showLoader(true);
    try {
        const res = await authFetch(`${API_URL}/cases/search?${params.toString()}`);
        showLoader(false);

        if (!res.ok) {
            const msg = await readErrorMessage(res, 'Search failed.');
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#ef4444;">${msg}</td></tr>`;
            return;
        }

        const data = await res.json();
        currentSearchPage = data.page || 0;
        renderSearchResults(data);
    } catch (err) {
        showLoader(false);
        if (err.message !== "403_FORBIDDEN" && err.message !== "401_UNAUTHORIZED") {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#ef4444;">Search error.</td></tr>`;
        }
    }
}

function renderSearchResults(data) {
    const tbody = document.getElementById('search-results-tbody');
    const cases = data.content || [];

    if (cases.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No cases match your criteria.</td></tr>';
    } else {
        tbody.innerHTML = '';
        cases.forEach(c => {
            const tr = document.createElement('tr');
            tr.onclick = () => showCaseDetail(c.caseNumber, 'search-cases');

            const values = [
                c.caseNumber || 'N/A',
                c.title || 'Untitled',
                c.clientUsername || '—',
                c.judgeUsername || 'Unassigned',
                formatCaseDate(c.filedDate),
            ];
            values.forEach(v => {
                const td = document.createElement('td');
                td.textContent = v;
                tr.appendChild(td);
            });
            const statusTd = document.createElement('td');
            statusTd.innerHTML = renderStatusChip(c.status);
            tr.appendChild(statusTd);

            tbody.appendChild(tr);
        });
    }

    // Pagination controls
    const paginationBar = document.getElementById('search-pagination');
    const totalPages = data.totalPages || 1;
    const totalElements = data.totalElements || 0;
    const page = data.page || 0;

    if (totalElements > 0) {
        paginationBar.style.display = 'flex';
        document.getElementById('search-page-info').textContent =
            `Page ${page + 1} of ${totalPages} (${totalElements} total)`;

        document.getElementById('search-prev-btn').disabled = page <= 0;
        document.getElementById('search-next-btn').disabled = page >= totalPages - 1;
    } else {
        paginationBar.style.display = 'none';
    }
}

function clearSearchFilters() {
    document.getElementById('search-query').value = '';
    document.getElementById('search-status').value = '';
    document.getElementById('search-client').value = '';
    document.getElementById('search-judge').value = '';
    document.getElementById('search-lawyer').value = '';
    document.getElementById('search-filed-date').value = '';
    document.getElementById('search-filed-from').value = '';
    document.getElementById('search-filed-to').value = '';
    document.getElementById('scope-my').checked = true;
    document.getElementById('search-results-tbody').innerHTML =
        '<tr><td colspan="6" style="text-align:center;">Use the filters above to search cases.</td></tr>';
    document.getElementById('search-pagination').style.display = 'none';
}


// =============================================
//  CASE DETAIL VIEW
// =============================================
async function showCaseDetail(caseNumber, source) {
    if (source) lastDetailSource = source;
    switchDashboardView('case-detail');

    const container = document.getElementById('case-detail-content');
    container.innerHTML = '<p>Loading case details...</p>';

    showLoader(true);
    try {
        const res = await authFetch(`${API_URL}/cases/${caseNumber}`);
        showLoader(false);

        if (!res.ok) {
            container.innerHTML = `<p style="color:#ef4444;">${await readErrorMessage(res, 'Case not found.')}</p>`;
            return;
        }

        const c = await res.json();
        renderCaseDetail(c);
    } catch (err) {
        showLoader(false);
        if (err.message !== "403_FORBIDDEN" && err.message !== "401_UNAUTHORIZED") {
            container.innerHTML = `<p style="color:#ef4444;">Error loading case.</p>`;
        }
    }
}

function goBackFromDetail() {
    switchDashboardView(lastDetailSource || 'overview');
}

function renderCaseDetail(c) {
    const container = document.getElementById('case-detail-content');
    container.innerHTML = `
        <div class="case-detail-header">
            <h2>${c.caseNumber || 'N/A'} ${renderStatusChip(c.status)}</h2>
            <p style="font-size:1.05rem;color:var(--text-dark);margin-bottom:4px;">${c.title || 'Untitled'}</p>
            <p style="font-size:0.9rem;color:var(--text-gray);">${c.description || ''}</p>
            <div class="case-meta-grid">
                <div class="case-meta-item">
                    <div class="meta-label">Client</div>
                    <div class="meta-value">${c.clientUsername || '—'}</div>
                </div>
                <div class="case-meta-item">
                    <div class="meta-label">Lawyer</div>
                    <div class="meta-value">${c.lawyerUsername || '—'}</div>
                </div>
                <div class="case-meta-item">
                    <div class="meta-label">Judge</div>
                    <div class="meta-value">${c.judgeUsername || 'Unassigned'}</div>
                </div>
                <div class="case-meta-item">
                    <div class="meta-label">Filed Date</div>
                    <div class="meta-value">${formatCaseDate(c.filedDate)}</div>
                </div>
                <div class="case-meta-item">
                    <div class="meta-label">Created At</div>
                    <div class="meta-value">${formatInstant(c.createdAt)}</div>
                </div>
                <div class="case-meta-item">
                    <div class="meta-label">Last Updated</div>
                    <div class="meta-value">${formatInstant(c.updatedAt)}</div>
                </div>
            </div>
        </div>

        <!-- Tabs -->
        <div class="detail-tabs">
            <button class="detail-tab active" onclick="switchDetailTab('documents', '${c.caseNumber}')">Documents</button>
            <button class="detail-tab" onclick="switchDetailTab('audit', '${c.caseNumber}')">Audit Trail</button>
        </div>

        <div id="detail-tab-documents" class="detail-tab-content active">
            <!-- Upload Zone -->
            <div class="upload-zone" id="upload-zone-${c.caseNumber}">
                <label class="upload-label" for="file-input-${c.caseNumber}">📎 Click to upload a document</label>
                <input type="file" id="file-input-${c.caseNumber}" onchange="uploadDocument('${c.caseNumber}')">
                <div class="upload-hint">Supported: PDF, DOCX, images, etc.</div>
            </div>
            <div id="upload-result-${c.caseNumber}"></div>

            <!-- Document list -->
            <h4 style="margin-top:20px;margin-bottom:10px;">Case Documents</h4>
            <div id="documents-list-${c.caseNumber}">
                <p style="color:var(--text-gray);">Loading documents...</p>
            </div>
        </div>

        <div id="detail-tab-audit" class="detail-tab-content">
            <div id="audit-trail-${c.caseNumber}">
                <p style="color:var(--text-gray);">Loading audit trail...</p>
            </div>
        </div>
    `;

    // Auto-load both documents and audit
    loadCaseDocuments(c.caseNumber);
    loadAuditTrail(c.caseNumber);
}

function switchDetailTab(tabName, caseNumber) {
    // Toggle tab buttons
    document.querySelectorAll('.detail-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.detail-tab-content').forEach(c => c.classList.remove('active'));

    const btn = event.currentTarget;
    btn.classList.add('active');

    const tabEl = document.getElementById(`detail-tab-${tabName}`);
    if (tabEl) tabEl.classList.add('active');
}


// =============================================
//  AUDIT TRAIL (GET /cases/{caseNumber}/audit)
// =============================================
async function loadAuditTrail(caseNumber) {
    const container = document.getElementById(`audit-trail-${caseNumber}`);
    if (!container) return;

    try {
        const res = await authFetch(`${API_URL}/cases/${caseNumber}/audit`);
        if (!res.ok) {
            container.innerHTML = `<p style="color:#ef4444;">Failed to load audit trail.</p>`;
            return;
        }

        const events = await res.json();
        if (!events || events.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>No audit events recorded yet.</p></div>`;
            return;
        }

        // Sort reverse-chronological
        events.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));

        let html = '<div class="audit-timeline">';
        events.forEach(ev => {
            const typeCls = 'type-' + (ev.eventType || '').toLowerCase().replace(/ /g, '_');
            html += `
                <div class="audit-event">
                    <div class="event-header">
                        <span>
                            <span class="event-type-badge ${typeCls}">${ev.eventType || 'EVENT'}</span>
                            <span class="event-actor" style="margin-left:8px;">by ${ev.actorUsername || 'System'}</span>
                        </span>
                        <span class="event-time">${formatInstant(ev.occurredAt)}</span>
                    </div>
                    <div class="event-details">${ev.details || '—'}</div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (err) {
        if (err.message !== "403_FORBIDDEN" && err.message !== "401_UNAUTHORIZED") {
            container.innerHTML = `<p style="color:#ef4444;">Error loading audit trail.</p>`;
        }
    }
}


// =============================================
//  DOCUMENTS (GET /cases/{caseNumber}/documents)
// =============================================
async function loadCaseDocuments(caseNumber) {
    const container = document.getElementById(`documents-list-${caseNumber}`);
    if (!container) return;

    try {
        const res = await authFetch(`${API_URL}/cases/${caseNumber}/documents`);
        if (!res.ok) {
            container.innerHTML = `<p style="color:#ef4444;">Failed to load documents.</p>`;
            return;
        }

        const docs = await res.json();
        if (!docs || docs.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">📂</div><p>No documents uploaded yet.</p></div>`;
            return;
        }

        let html = '<div class="doc-list">';
        docs.forEach(doc => {
            html += `
                <div class="doc-item">
                    <div class="doc-item-info">
                        <div class="doc-icon">📄</div>
                        <div class="doc-item-meta">
                            <h4>${doc.originalFilename || 'Unknown file'}</h4>
                            <span>${formatBytes(doc.sizeBytes)} · ${doc.contentType || '—'} · Uploaded by <strong>${doc.uploadedBy || '—'}</strong> · ${formatInstant(doc.uploadedAt)}</span>
                        </div>
                    </div>
                    <button class="doc-download-btn" onclick="downloadDocument('${caseNumber}', ${doc.id})">Download</button>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (err) {
        if (err.message !== "403_FORBIDDEN" && err.message !== "401_UNAUTHORIZED") {
            container.innerHTML = `<p style="color:#ef4444;">Error loading documents.</p>`;
        }
    }
}


// =============================================
//  DOCUMENT UPLOAD (POST /cases/{caseNumber}/documents)
// =============================================
async function uploadDocument(caseNumber) {
    const fileInput = document.getElementById(`file-input-${caseNumber}`);
    if (!fileInput || !fileInput.files.length) return;

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    const resultContainer = document.getElementById(`upload-result-${caseNumber}`);
    resultContainer.innerHTML = '<p style="color:var(--text-gray);">Uploading...</p>';

    showLoader(true);
    try {
        const res = await authFetch(`${API_URL}/cases/${caseNumber}/documents`, {
            method: 'POST',
            body: formData
        });
        showLoader(false);

        if (!res.ok) {
            const msg = await readErrorMessage(res, 'Upload failed.');
            resultContainer.innerHTML = `<p style="color:#ef4444;">${msg}</p>`;
            return;
        }

        const doc = await res.json();
        resultContainer.innerHTML = `
            <div class="doc-upload-result">
                <h4>✓ Document Uploaded Successfully</h4>
                <div class="upload-detail-grid">
                    <span class="ud-label">Filename</span><span>${doc.originalFilename || file.name}</span>
                    <span class="ud-label">Size</span><span>${formatBytes(doc.sizeBytes)}</span>
                    <span class="ud-label">Uploaded By</span><span>${doc.uploadedBy || '—'}</span>
                    <span class="ud-label">Uploaded At</span><span>${formatInstant(doc.uploadedAt)}</span>
                    <span class="ud-label">Content Type</span><span>${doc.contentType || '—'}</span>
                </div>
            </div>
        `;

        // Refresh the documents list and audit trail
        fileInput.value = '';
        loadCaseDocuments(caseNumber);
        loadAuditTrail(caseNumber);
    } catch (err) {
        showLoader(false);
        if (err.message !== "403_FORBIDDEN" && err.message !== "401_UNAUTHORIZED") {
            resultContainer.innerHTML = `<p style="color:#ef4444;">Upload error.</p>`;
        }
    }
}


// =============================================
//  DOCUMENT DOWNLOAD
// =============================================
function downloadDocument(caseNumber, documentId) {
    const token = localStorage.getItem('jwt');
    // Open in new tab with auth — use a hidden link approach
    const url = `${API_URL}/cases/${caseNumber}/documents/${documentId}/download`;

    fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(res => {
            if (!res.ok) throw new Error('Download failed');
            const disposition = res.headers.get('Content-Disposition');
            let filename = 'download';
            if (disposition) {
                const match = disposition.match(/filename="(.+)"/);
                if (match) filename = match[1];
            }
            return res.blob().then(blob => ({ blob, filename }));
        })
        .then(({ blob, filename }) => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
        })
        .catch(err => {
            alert('Download failed: ' + err.message);
        });
}


// =============================================
//  FILE CASE (existing)
// =============================================
document.getElementById('file-case-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader(true);

    const role = localStorage.getItem('role');
    const payload = {
        title: document.getElementById('case-title').value,
        description: document.getElementById('case-desc').value
    };

    const clientUsername = document.getElementById('case-client').value.trim();
    if ((role === 'ADMIN' || role === 'LAWYER') && clientUsername) {
        payload.clientUsername = clientUsername;
    }

    try {
        const res = await authFetch(`${API_URL}/cases`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        showLoader(false);

        if (!res.ok) {
            const message = await readErrorMessage(res, 'Unable to file case.');
            updateMessage('file-message', message, true);
            return;
        }

        const data = await readJsonSafely(res);
        const successMessage = data?.caseNumber
            ? `Case filed successfully: ${data.caseNumber}`
            : 'Case filed successfully.';

        updateMessage('file-message', successMessage, false);
        document.getElementById('file-case-form').reset();
        loadInitialData();
    } catch (err) {
        showLoader(false);
        if (err.message !== "403_FORBIDDEN" && err.message !== "401_UNAUTHORIZED") {
            updateMessage('file-message', err.message, true);
        }
    }
});


// =============================================
//  VIEW CASE (quick lookup — existing)
// =============================================
async function viewCase() {
    const caseId = document.getElementById('view-case-id').value;
    const resultBox = document.getElementById('case-result');
    if (!caseId) return;

    showLoader(true);
    try {
        const res = await authFetch(`${API_URL}/cases/${caseId}`);
        showLoader(false);
        resultBox.style.display = 'block';

        if (!res.ok) {
            resultBox.innerText = await readErrorMessage(res, 'Case not found.');
            resultBox.style.borderLeftColor = res.status === 404 ? '#f59e0b' : '#ef4444';
            return;
        }

        const data = await res.json();
        resultBox.innerText = JSON.stringify(data, null, 2);
        resultBox.style.borderLeftColor = '#22c55e';
    } catch (err) {
        showLoader(false);
        if (err.message !== "403_FORBIDDEN" && err.message !== "401_UNAUTHORIZED") {
            resultBox.style.display = 'block';
            resultBox.innerText = err.message;
            resultBox.style.borderLeftColor = '#ef4444';
        }
    }
}


// =============================================
//  ADMIN USERS (existing)
// =============================================
async function loadAllUsers() {
    const resultBox = document.getElementById('users-result');
    showLoader(true);
    try {
        const res = await authFetch(`${API_URL}/admin/users`);
        showLoader(false);

        if (!res.ok) {
            resultBox.style.display = 'block';
            resultBox.innerText = await readErrorMessage(res, 'Unable to load users.');
            resultBox.style.borderLeftColor = '#ef4444';
            return;
        }

        const data = await res.json();
        resultBox.style.display = 'block';
        resultBox.innerText = JSON.stringify(data, null, 2);
        resultBox.style.borderLeftColor = '#22c55e';
    } catch (err) {
        showLoader(false);
        if (err.message !== "403_FORBIDDEN" && err.message !== "401_UNAUTHORIZED") {
            resultBox.style.display = 'block';
            resultBox.innerText = err.message;
            resultBox.style.borderLeftColor = '#ef4444';
        }
    }
}


// =============================================
//  JUDGE ACTIONS (existing)
// =============================================
async function assignJudge() {
    const caseId = document.getElementById('judge-case-id').value;
    if (!caseId) return;
    showLoader(true);
    try {
        const res = await authFetch(`${API_URL}/cases/${caseId}/assign`, { method: 'PUT' });
        showLoader(false);

        if (!res.ok) {
            updateMessage('judge-message', await readErrorMessage(res, 'Unable to assign case.'), true);
            return;
        }

        const data = await readJsonSafely(res);
        updateMessage('judge-message', data?.message || 'Judge assigned successfully.', false);
        loadInitialData();
    } catch (err) {
        showLoader(false);
        if (err.message !== "403_FORBIDDEN" && err.message !== "401_UNAUTHORIZED") {
            updateMessage('judge-message', err.message, true);
        }
    }
}

async function closeCase() {
    const caseId = document.getElementById('judge-case-id').value;
    if (!caseId) return;
    showLoader(true);
    try {
        const res = await authFetch(`${API_URL}/cases/${caseId}/status?status=CLOSED`, { method: 'PUT' });
        showLoader(false);

        if (!res.ok) {
            updateMessage('judge-message', await readErrorMessage(res, 'Unable to close case.'), true);
            return;
        }

        const data = await readJsonSafely(res);
        updateMessage('judge-message', data?.message || 'Case closed successfully.', false);
        loadInitialData();
    } catch (err) {
        showLoader(false);
        if (err.message !== "403_FORBIDDEN" && err.message !== "401_UNAUTHORIZED") {
            updateMessage('judge-message', err.message, true);
        }
    }
}
