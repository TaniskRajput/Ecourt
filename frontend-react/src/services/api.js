import axios from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const API_URL = configuredApiUrl || '';

const api = axios.create({
    baseURL: API_URL,
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('jwt');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    // Don't set Content-Type for FormData (let browser set it)
    if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    }
    return config;
});

// Handle 401/403 globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.clear();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// --- Auth ---
export const login = (username, password) =>
    api.post('/auth/login', { username, password });

export const register = (username, email, password, role) =>
    api.post('/auth/register', { username, email, password, role });
export const requestRegistrationOtp = (payload) =>
    api.post('/auth/register/request-otp', payload);
export const verifyRegistrationOtp = (payload) =>
    api.post('/auth/register/verify-otp', payload);
export const completeRegistration = (payload) =>
    api.post('/auth/register/complete', payload);
export const requestPasswordResetOtp = (payload) =>
    api.post('/auth/password/request-reset', payload);
export const verifyPasswordResetOtp = (payload) =>
    api.post('/auth/password/verify-otp', payload);
export const completePasswordReset = (payload) =>
    api.post('/auth/password/reset', payload);
export const beginGoogleAuth = (payload) =>
    api.post('/auth/google', payload);

// --- Cases ---
export const getMyCases = () => api.get('/cases/my');
export const getAllCases = () => api.get('/cases/all');
export const getDashboardSummary = () => api.get('/cases/dashboard');
export const getCaseByNumber = (caseNumber) => api.get(`/cases/${caseNumber}`);
export const fileCase = (payload) => api.post('/cases', payload);
export const searchCases = (params) => api.get('/cases/search', { params });
export const searchPublicCases = (params) => api.get('/public/cases/track', { params });
export const getPublicCaseTrackingDetail = (caseNumber) => api.get(`/public/cases/${caseNumber}`);

// --- Judge actions ---
export const assignJudge = (caseNumber, judgeUsername) =>
    api.put(`/cases/${caseNumber}/assign`, null, {
        params: judgeUsername ? { judgeUsername } : {},
    });
export const updateCaseStatus = (caseNumber, status) =>
    api.put(`/cases/${caseNumber}/status`, null, { params: { status } });
export const addHearing = (caseNumber, payload) =>
    api.post(`/cases/${caseNumber}/hearings`, payload);
export const getHearings = (caseNumber) =>
    api.get(`/cases/${caseNumber}/hearings`);
export const getOrders = (caseNumber) =>
    api.get(`/cases/${caseNumber}/orders`);
export const uploadOrder = (caseNumber, payload) => {
    const formData = new FormData();
    formData.append('file', payload.file);
    formData.append('orderType', payload.orderType);
    if (payload.title) formData.append('title', payload.title);
    if (payload.orderDate) formData.append('orderDate', payload.orderDate);
    return api.post(`/cases/${caseNumber}/orders`, formData);
};

// --- Documents ---
export const getCaseDocuments = (caseNumber) =>
    api.get(`/cases/${caseNumber}/documents`);
export const uploadDocument = (caseNumber, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/cases/${caseNumber}/documents`, formData);
};
export const downloadDocument = async (caseNumber, documentId) => {
    const response = await api.get(
        `/cases/${caseNumber}/documents/${documentId}/download`,
        { responseType: 'blob' }
    );
    const disposition = response.headers['content-disposition'];
    let filename = 'download';
    if (disposition) {
        const match = disposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
    }
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
};
export const downloadPublicOrder = async (caseNumber, documentId) => {
    const response = await api.get(
        `/public/cases/${caseNumber}/orders/${documentId}/download`,
        { responseType: 'blob' }
    );
    const disposition = response.headers['content-disposition'];
    let filename = 'court-order';
    if (disposition) {
        const match = disposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
    }
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
};

// --- Audit ---
export const getAuditTrail = (caseNumber) =>
    api.get(`/cases/${caseNumber}/audit`);

// --- Admin ---
export const getAllUsers = (params = {}) => api.get('/admin/users', {
    params: { size: 100, ...params },
});
export const createUser = (payload) => api.post('/admin/users', payload);
export const updateUserRole = (userId, role) =>
    api.put(`/admin/users/${userId}/role`, { role });
export const updateUserStatus = (userId, active) =>
    api.put(`/admin/users/${userId}/status`, { active });

// --- User Profile ---
export const getMyProfile = () => api.get('/users/me');
export const updateMyProfile = (username, payload) => 
    api.put('/users/me', payload, { params: { username } });
export const changeMyPassword = (payload) => api.put('/users/me/password', payload);


// --- Notifications ---
export const getNotifications = () => api.get('/notifications');
export const markNotificationRead = (notificationId) =>
    api.put(`/notifications/${notificationId}/read`);
export const markAllNotificationsRead = () => api.put('/notifications/read-all');

export default api;
