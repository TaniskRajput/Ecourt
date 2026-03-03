const API_URL = 'http://localhost:8080';

// Check auth state on load
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwt');
    if (token) {
        showDashboard();
    }
});

// Tab Switcher
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
    event.target.classList.add('active');
}

function showLoader(show) {
    document.getElementById('loader').style.display = show ? 'flex' : 'none';
}

function updateMessage(id, msg, isError = false) {
    const el = document.getElementById(id);
    el.innerText = msg;
    el.className = `message ${isError ? 'error' : 'success'}`;
    setTimeout(() => el.innerText = '', 5000);
}

// ----- AUTHENTICATION ----- //

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
            setTimeout(() => switchTab('login'), 2000);
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
    document.getElementById('dashboard-section').classList.remove('active');
    document.getElementById('auth-section').classList.add('active');

    // reset generic fields
    document.getElementById('case-result').style.display = 'none';
    document.getElementById('file-case-form').reset();
    document.getElementById('view-case-id').value = '';
    document.getElementById('users-result').style.display = 'none';
    document.getElementById('my-cases-result').style.display = 'none';
}

// ----- DASHBOARD LOGIC ----- //

function showDashboard() {
    document.getElementById('auth-section').classList.remove('active');
    document.getElementById('dashboard-section').classList.add('active');

    // Restore data
    const role = localStorage.getItem('role') || 'Unknown User';
    const username = localStorage.getItem('username') || '';

    document.getElementById('user-display').innerText = `Hello, ${username}`;
    document.getElementById('role-display').innerText = role;

    // Apply RBAC UI Rules
    // Admin
    if (role === 'ADMIN') {
        document.getElementById('admin-section').style.display = 'block';
    } else {
        document.getElementById('admin-section').style.display = 'none';
    }

    // Judge
    if (role === 'JUDGE' || role === 'ADMIN') {
        document.getElementById('judge-section').style.display = 'block';
    } else {
        document.getElementById('judge-section').style.display = 'none';
    }

    // Only lawyers can see the filing panel completely safely
    if (role === 'LAWYER' || role === 'ADMIN') {
        document.getElementById('lawyer-section').style.display = 'block';
        document.querySelector('.glass-panel').style.maxWidth = '700px';
    } else {
        document.getElementById('lawyer-section').style.display = 'none';
        document.querySelector('.glass-panel').style.maxWidth = '500px';
    }
}

// ----- CASE MANAGEMENT (API Testing) ----- //

// Helper for authorized fetches
async function authFetch(url, options = {}) {
    const token = localStorage.getItem('jwt');
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };
    return fetch(url, { ...options, headers });
}

// File Case
document.getElementById('file-case-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader(true);

    const payload = {
        caseNumber: document.getElementById('case-num').value,
        title: document.getElementById('case-title').value,
        description: document.getElementById('case-desc').value,
        clientUsername: document.getElementById('case-client').value
    };

    try {
        const res = await authFetch(`${API_URL}/cases`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (res.status === 403) throw new Error("403 Forbidden: You lack LAWYER permissions.");

        const text = await res.text();
        showLoader(false);

        updateMessage('file-message', text, !res.ok);
        if (res.ok) {
            document.getElementById('file-case-form').reset();
        }
    } catch (err) {
        showLoader(false);
        updateMessage('file-message', err.message, true);
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

        if (res.status === 403) {
            resultBox.innerText = `❌ Error 403: Forbidden\n\nRBAC Enforced: You are not authorized to view this case. Either you are not a Client/Lawyer/Admin, or you are a Client trying to view someone else's case!`;
            resultBox.style.borderColor = '#ef4444';
        } else if (res.status === 401) {
            resultBox.innerText = "❌ Error 401: Unauthorized (Token expired/invalid)";
            resultBox.style.borderColor = '#ef4444';
        } else {
            // Let's try to pretty print JSON if it's JSON
            try {
                const json = JSON.parse(data);
                if (json == null) throw new Error("Not Found");

                resultBox.innerText = JSON.stringify(json, null, 2);
                resultBox.style.borderColor = '#22c55e';
            } catch (e) {
                if (data.includes("Case already exists") || !data) {
                    resultBox.innerText = "Case not found.";
                    resultBox.style.borderColor = '#f59e0b';
                } else {
                    resultBox.innerText = data;
                }
            }
        }
    } catch (err) {
        showLoader(false);
        resultBox.style.display = 'block';
        resultBox.innerText = err.message;
        resultBox.style.borderColor = '#ef4444';
    }
}

// ----- PHASE 2 FEATURES ----- //

// Admin: Load All Users
async function loadAllUsers() {
    const resultBox = document.getElementById('users-result');
    showLoader(true);
    try {
        const res = await authFetch(`${API_URL}/admin/users`);
        const data = await res.json();
        showLoader(false);

        resultBox.style.display = 'block';
        if (res.status === 403) throw new Error("403 Forbidden: You lack ADMIN permissions.");

        resultBox.innerText = JSON.stringify(data, null, 2);
        resultBox.style.borderColor = '#22c55e';
    } catch (err) {
        showLoader(false);
        resultBox.style.display = 'block';
        resultBox.innerText = err.message;
        resultBox.style.borderColor = '#ef4444';
    }
}

// Lawyer: Load My Filed Cases
async function loadMyCases() {
    const resultBox = document.getElementById('my-cases-result');
    showLoader(true);
    try {
        const res = await authFetch(`${API_URL}/cases/lawyer`);
        const data = await res.json();
        showLoader(false);

        resultBox.style.display = 'block';
        if (res.status === 403) throw new Error("403 Forbidden: You lack LAWYER permissions.");

        resultBox.innerText = data.length > 0 ? JSON.stringify(data, null, 2) : "You have not filed any cases yet.";
        resultBox.style.borderColor = '#22c55e';
    } catch (err) {
        showLoader(false);
        resultBox.style.display = 'block';
        resultBox.innerText = err.message;
        resultBox.style.borderColor = '#ef4444';
    }
}

// Judge: Assign Case
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
        updateMessage('judge-message', err.message, true);
    }
}

// Judge: Close Case
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
        updateMessage('judge-message', err.message, true);
    }
}
