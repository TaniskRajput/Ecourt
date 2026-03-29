const API_URL = window.location.port === '8080'
    ? window.location.origin
    : 'http://localhost:8080';

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
    // Reset Views
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('dashboard-container').style.display = 'none';

    document.getElementById('login-box').style.display = 'none';
    document.getElementById('register-box').style.display = 'none';
    document.getElementById('logout-success-box').style.display = 'none';

    // Top Nav buttons
    const navAuth = document.getElementById('nav-auth-buttons');

    if (screenId === 'home') screenId = 'login'; // Defaults 'home' button to showing login page.

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
    // Clear dynamically listed cases, etc
    document.getElementById('cases-tbody').innerHTML = '';

    // Show the customized logout mockup layout
    showScreen('logout');
}

// ----- DASHBOARD LAYOUT & ROUTING ----- //
function showDashboard() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('dashboard-container').style.display = 'flex';

    // Hide auth buttons in the navbar when authenticated
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

    loadInitialData();
}

function switchDashboardView(viewId) {
    // Hide all views
    document.querySelectorAll('.dash-view').forEach(el => el.classList.remove('active'));

    // De-activate all menu items
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));

    // Activate specific view
    const viewEl = document.getElementById(`view-${viewId}`);
    if (viewEl) viewEl.classList.add('active');

    // Attempt to map and activate the menu item clicked based on inline onclicks mapped to viewIds
    const menus = Array.from(document.querySelectorAll('.menu-item'));
    for (let m of menus) {
        if (m.getAttribute('onclick') && m.getAttribute('onclick').includes(viewId)) {
            m.classList.add('active');
            break;
        }
    }
}

// Customized Access Denied Error handling
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
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };

    const res = await fetch(url, { ...options, headers });

    if (res.status === 403) {
        showAccessDeniedModal();
        throw new Error("403_FORBIDDEN");
    } else if (res.status === 401) {
        logout(); // Force logout on 401
        throw new Error("401_UNAUTHORIZED");
    }

    return res;
}

// ----- DATA POPULATION ----- //

async function loadInitialData() {
    const role = localStorage.getItem('role');
    const tbody = document.getElementById('cases-tbody');
    tbody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';

    try {
        let res;
        let data;
        if (role === 'ADMIN') {
            res = await authFetch(`${API_URL}/cases/all`);
            data = await res.json();
            populateTable(data, tbody);
        } else {
            res = await authFetch(`${API_URL}/cases/my`);
            data = await res.json();
            populateTable(data, tbody);
        }

    } catch (e) {
        if (e.message !== "403_FORBIDDEN" && e.message !== "401_UNAUTHORIZED") {
            tbody.innerHTML = `<tr><td colspan="4">Failed to load data.</td></tr>`;
        }
    }
}

function formatCaseDate(dateValue) {
    if (!dateValue) return 'N/A';

    const parsedDate = new Date(dateValue);
    return Number.isNaN(parsedDate.getTime()) ? dateValue : parsedDate.toLocaleDateString();
}

function populateTable(cases, tbody) {
    if (!cases || cases.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No cases found.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    cases.forEach(c => {
        const tr = document.createElement('tr');
        [
            c.caseNumber || 'N/A',
            c.title || 'Untitled',
            c.judgeUsername || 'Unassigned',
            c.status || 'PENDING'
        ].forEach(value => {
            const td = document.createElement('td');
            td.textContent = value;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

// ----- OTHER FUNCTIONALITIES (MAPPED TO EXISTING BACKEND) ----- //

// File Case
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

// View Case
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

// Admin Users
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

// Judge Assign
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

// Judge Close
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
