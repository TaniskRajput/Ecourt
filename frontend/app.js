const API_URL = 'http://localhost:8080';

// Initialize UI on load
document.addEventListener('DOMContentLoaded', () => {
    // If token exists, try to show dashboard directly
    const token = localStorage.getItem('jwt');
    if (token) {
        showDashboard();
    } else {
        showScreen('home'); // which effectively shows login for our logic to demo the system
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
        const text = await res.text();
        showLoader(false);

        if (text.includes('successfully')) {
            updateMessage('reg-message', 'Registration successful! Please login.', false);
            setTimeout(() => showScreen('login'), 2000);
        } else {
            updateMessage('reg-error', text, true);
        }
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

        if (!res.ok) throw new Error("Invalid credentials");

        const data = await res.json();
        localStorage.setItem('jwt', data.token);
        localStorage.setItem('username', data.username);
        localStorage.setItem('role', data.role);

        showLoader(false);
        showDashboard();
    } catch (err) {
        showLoader(false);
        updateMessage('login-error', 'Login failed. Check credentials.', true);
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

    // Update banner text
    document.getElementById('user-display-name').innerText = username;
    document.getElementById('user-role-name').innerText = role;

    // RBAC Nav Hiding/Showing
    const navFile = document.getElementById('nav-lawyer-file');
    const navAddCase = document.getElementById('nav-add-case');

    // Admin
    if (role === 'ADMIN') {
        document.getElementById('admin-user-mgmt').style.display = 'block';
        navFile.style.display = 'flex'; // Let admins explore
        navFile.classList.remove('disabled-menu');
        document.getElementById('judge-case-actions').style.display = 'block';
    } else {
        document.getElementById('admin-user-mgmt').style.display = 'none';
    }

    // Judge
    if (role === 'JUDGE' && role !== 'ADMIN') {
        document.getElementById('judge-case-actions').style.display = 'block';
    } else if (role !== 'ADMIN') {
        document.getElementById('judge-case-actions').style.display = 'none';
    }

    // Lawyer Specific Sidebar Hook (Mocking the UI mockup which has active "File Cases" etc)
    if (role === 'LAWYER' || role === 'ADMIN') {
        navFile.style.display = 'flex';
        navAddCase.style.display = 'flex';
        navFile.classList.remove('disabled-menu');
    } else {
        navFile.style.display = 'none';
        navAddCase.style.display = 'none';
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
        let res, data;
        if (role === 'LAWYER') {
            res = await authFetch(`${API_URL}/cases/lawyer`);
            data = await res.json();
            populateTable(data, tbody);
        } else if (role === 'ADMIN' || role === 'JUDGE') {
            // Usually an endpoint to get all cases would exist. Let's try getting someone's case or an array.
            // If backend doesn't support 'GET /cases' for all, we'll keep the table empty with a note.
            tbody.innerHTML = '<tr><td colspan="4">Use "Manage Cases" to search specific case IDs.</td></tr>';
        } else {
            tbody.innerHTML = '<tr><td colspan="4">Use "Manage Cases" to search for your case IDs.</td></tr>';
        }

    } catch (e) {
        if (e.message !== "403_FORBIDDEN" && e.message !== "401_UNAUTHORIZED") {
            tbody.innerHTML = `<tr><td colspan="4">Failed to load data.</td></tr>`;
        }
    }
}

function populateTable(cases, tbody) {
    if (!cases || cases.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No cases found.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    cases.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${c.caseNumber}</td>
            <td>${new Date(c.filedDate || Date.now()).toLocaleDateString()}</td>
            <td>${c.judgeUsername || 'Unassigned'}</td>
            <td>${c.status || 'PENDING'}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ----- OTHER FUNCTIONALITIES (MAPPED TO EXISTING BACKEND) ----- //

// File Case
document.getElementById('file-case-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader(true);

    const payload = {
        caseNumber: document.getElementById('case-num').value,
        title: document.getElementById('case-title').value,
        description: document.getElementById('case-desc').value,
        clientUsername: document.getElementById('case-client').value,
        filedDate: document.getElementById('case-date').value
    };

    try {
        const res = await authFetch(`${API_URL}/cases`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const text = await res.text();
        showLoader(false);

        updateMessage('file-message', text, !res.ok);
        if (res.ok) {
            document.getElementById('file-case-form').reset();
            loadInitialData(); // Reload background table
        }
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
        const data = await res.text();
        showLoader(false);

        resultBox.style.display = 'block';

        try {
            const json = JSON.parse(data);
            if (json == null) throw new Error("Not Found");
            resultBox.innerText = JSON.stringify(json, null, 2);
            resultBox.style.borderLeftColor = '#22c55e';
        } catch (e) {
            if (data.includes("Case already exists") || !data) {
                resultBox.innerText = "Case not found.";
                resultBox.style.borderLeftColor = '#f59e0b';
            } else {
                resultBox.innerText = data;
            }
        }

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
        const data = await res.json();
        showLoader(false);

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
        const text = await res.text();
        showLoader(false);
        updateMessage('judge-message', text, !res.ok);
    } catch (err) {
        showLoader(false);
        if (err.message !== "403_FORBIDDEN") updateMessage('judge-message', err.message, true);
    }
}

// Judge Close
async function closeCase() {
    const caseId = document.getElementById('judge-case-id').value;
    if (!caseId) return;
    showLoader(true);
    try {
        const res = await authFetch(`${API_URL}/cases/${caseId}/status?status=CLOSED`, { method: 'PUT' });
        const text = await res.text();
        showLoader(false);
        updateMessage('judge-message', text, !res.ok);
    } catch (err) {
        showLoader(false);
        if (err.message !== "403_FORBIDDEN") updateMessage('judge-message', err.message, true);
    }
}
