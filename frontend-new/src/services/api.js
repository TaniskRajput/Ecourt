const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()
const API_URL = configuredApiUrl ?? ''

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

// ── Auth ────────────────────────────────────────────────────────────────

export async function login(username, password) {
    return request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    })
}

export async function register(payload) {
    return request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

// ── Cases ───────────────────────────────────────────────────────────────

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

export async function searchCases(params = {}) {
    const query = new URLSearchParams({ size: '10', ...params }).toString()
    return request(`/cases/search?${query}`)
}

export async function getCaseByNumber(caseNumber) {
    return request(`/cases/${encodeURIComponent(caseNumber)}`)
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

// ── Documents ───────────────────────────────────────────────────────────

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

export async function getCaseDocuments(caseNumber) {
    return request(`/cases/${encodeURIComponent(caseNumber)}/documents`)
}

export function getDocumentDownloadUrl(caseNumber, documentId) {
    return `${API_URL}/cases/${encodeURIComponent(caseNumber)}/documents/${documentId}/download`
}

// ── Hearings ────────────────────────────────────────────────────────────

export async function getCaseHearings(caseNumber) {
    return request(`/cases/${encodeURIComponent(caseNumber)}/hearings`)
}

export async function addHearing(caseNumber, payload) {
    return request(`/cases/${encodeURIComponent(caseNumber)}/hearings`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

// ── Orders ──────────────────────────────────────────────────────────────

export async function getCaseOrders(caseNumber) {
    return request(`/cases/${encodeURIComponent(caseNumber)}/orders`)
}

export async function uploadOrder(caseNumber, file, orderType, title, orderDate) {
    const token = localStorage.getItem('jwt')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('orderType', orderType)
    if (title) formData.append('title', title)
    if (orderDate) formData.append('orderDate', orderDate)

    const response = await fetch(`${API_URL}/cases/${encodeURIComponent(caseNumber)}/orders`, {
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
        throw new Error(data.message || data.error || data.detail || 'Order upload failed')
    }

    return data
}

// ── Audit ───────────────────────────────────────────────────────────────

export async function getCaseAudit(caseNumber) {
    return request(`/cases/${encodeURIComponent(caseNumber)}/audit`)
}

// ── Notifications ───────────────────────────────────────────────────────

export async function getNotifications() {
    return request('/notifications')
}

export async function markNotificationRead(notificationId) {
    return request(`/notifications/${notificationId}/read`, { method: 'PUT' })
}

export async function markAllNotificationsRead() {
    return request('/notifications/read-all', { method: 'PUT' })
}

// ── Admin ───────────────────────────────────────────────────────────────

export async function getAdminUsers(params = {}) {
    const query = new URLSearchParams({ size: '100', ...params }).toString()
    return request(`/admin/users?${query}`)
}

export async function adminCreateUser(payload) {
    return request('/admin/users', {
        method: 'POST',
        body: JSON.stringify(payload),
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

// ── User Profile ────────────────────────────────────────────────────────

export async function getMyProfile() {
    return request('/users/me')
}

export async function updateMyProfile(payload) {
    return request('/users/me', {
        method: 'PUT',
        body: JSON.stringify(payload),
    })
}

export async function changeMyPassword(oldPassword, newPassword) {
    return request('/users/me/password', {
        method: 'PUT',
        body: JSON.stringify({ oldPassword, newPassword }),
    })
}

// ── Public Case Tracking ────────────────────────────────────────────────

export async function publicTrackCases(params = {}) {
    const query = new URLSearchParams(params).toString()
    return request(`/public/cases/track?${query}`)
}

export async function publicGetCaseDetail(caseNumber) {
    return request(`/public/cases/${encodeURIComponent(caseNumber)}`)
}

export function publicGetOrderDownloadUrl(caseNumber, documentId) {
    return `${API_URL}/public/cases/${encodeURIComponent(caseNumber)}/orders/${documentId}/download`
}
