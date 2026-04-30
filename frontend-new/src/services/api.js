const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()
const API_URL = configuredApiUrl || 'http://127.0.0.1:8081'

async function request(path, options = {}) {
    const token = localStorage.getItem('jwt')
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
    })

    const contentType = response.headers.get('content-type') || ''
    const data = contentType.includes('application/json')
        ? await response.json()
        : { message: await response.text() }

    if (!response.ok) {
        throw new Error(data.message || data.error || data.detail || 'Request failed')
    }

    return data
}

export async function login(username, password) {
    return request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    })
}

export async function register({ username, email, password, role }) {
    return request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password, role }),
    })
}

export async function requestRegistrationOtp({ username, email, role }) {
    return request('/auth/register/request-otp', {
        method: 'POST',
        body: JSON.stringify({ username, email, role }),
    })
}

export async function verifyRegistrationOtp({ email, otp }) {
    return request('/auth/register/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
    })
}

export async function completeRegistration({ username, email, password, confirmPassword, verificationTicket, role }) {
    return request('/auth/register/complete', {
        method: 'POST',
        body: JSON.stringify({ username, email, password, confirmPassword, verificationTicket, role }),
    })
}

export async function beginGoogleAuth() {
    return request('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential: 'device-google-account' }),
    })
}

export async function fileCase(payload) {
    return request('/cases', {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

export async function getDashboardSummary() {
    return request('/cases/dashboard')
}

export async function getAllCases() {
    return request('/cases/all')
}

export async function getMyCases() {
    return request('/cases/my')
}

export async function getAdminUsers(params = {}) {
    const query = new URLSearchParams({ size: '100', ...params }).toString()
    return request(`/admin/users?${query}`)
}

export async function searchCases(params = {}) {
    const query = new URLSearchParams({ size: '10', ...params }).toString()
    return request(`/cases/search?${query}`)
}

export async function getCaseByNumber(caseNumber) {
    return request(`/cases/${encodeURIComponent(caseNumber)}`)
}

export async function getCaseAudit(caseNumber) {
    return request(`/cases/${encodeURIComponent(caseNumber)}/audit`)
}

export async function getCaseDocuments(caseNumber) {
    return request(`/cases/${encodeURIComponent(caseNumber)}/documents`)
}

export async function getCaseHearings(caseNumber) {
    return request(`/cases/${encodeURIComponent(caseNumber)}/hearings`)
}

export async function updateCaseStatus(caseNumber, status) {
    return request(`/cases/${encodeURIComponent(caseNumber)}/status?${new URLSearchParams({ status })}`, {
        method: 'PUT',
    })
}

export async function assignJudge(caseNumber, judgeUsername) {
    const query = judgeUsername ? `?${new URLSearchParams({ judgeUsername })}` : ''
    return request(`/cases/${encodeURIComponent(caseNumber)}/assign${query}`, {
        method: 'PUT',
    })
}

export async function updateUserRole(userId, role) {
    return request(`/admin/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
    })
}

export async function updateUserStatus(userId, active) {
    return request(`/admin/users/${userId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ active }),
    })
}

export async function getNotifications() {
    return request('/notifications')
}

export async function uploadCaseDocument(caseNumber, file) {
    const token = localStorage.getItem('jwt')
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_URL}/cases/${caseNumber}/documents`, {
        method: 'POST',
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
    })

    const contentType = response.headers.get('content-type') || ''
    const data = contentType.includes('application/json')
        ? await response.json()
        : { message: await response.text() }

    if (!response.ok) {
        throw new Error(data.message || data.error || data.detail || 'Document upload failed')
    }

    return data
}
