import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    assignJudge,
    getAllUsers,
    getCaseByNumber,
    getDashboardSummary,
    searchCases,
    updateCaseStatus,
    updateUserRole,
    updateUserStatus,
} from '../../services/api';
import StatusChip from '../../components/StatusChip';

function formatDateTime(value) {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export default function ManageCases() {
    const { user } = useAuth();
    const role = user?.role || '';

    const [lookupId, setLookupId] = useState('');
    const [lookupResult, setLookupResult] = useState(null);
    const [lookupError, setLookupError] = useState('');

    const [dashboardSummary, setDashboardSummary] = useState(null);
    const [managedCases, setManagedCases] = useState([]);
    const [users, setUsers] = useState([]);
    const [judgeUsers, setJudgeUsers] = useState([]);
    const [message, setMessage] = useState({ text: '', isError: false });
    const [loading, setLoading] = useState(true);
    const [judgeActions, setJudgeActions] = useState({});
    const [refreshing, setRefreshing] = useState(false);
    const [submitting, setSubmitting] = useState({});

    const setRowSubmitting = (key, value) => {
        setSubmitting((current) => ({ ...current, [key]: value }));
    };

    const clearJudgeAction = (caseNumber, field) => {
        setJudgeActions((current) => ({
            ...current,
            [caseNumber]: {
                ...current[caseNumber],
                [field]: '',
            },
        }));
    };

    const loadData = async ({ showLoader = true } = {}) => {
        if (showLoader) {
            setLoading(true);
        } else {
            setRefreshing(true);
        }
        try {
            const tasks = [
                getDashboardSummary().catch(() => ({ data: null })),
                role === 'ADMIN'
                    ? searchCases({ scope: 'all', page: 0, size: 20, sortBy: 'updatedAt', direction: 'desc' }).catch(() => ({ data: { content: [] } }))
                    : role === 'JUDGE'
                        ? searchCases({ scope: 'all', page: 0, size: 20, sortBy: 'updatedAt', direction: 'desc' }).catch(() => ({ data: { content: [] } }))
                        : searchCases({ scope: 'my', page: 0, size: 20, sortBy: 'updatedAt', direction: 'desc' }).catch(() => ({ data: { content: [] } })),
            ];

            if (role === 'ADMIN') {
                tasks.push(getAllUsers({ size: 100 }).catch(() => ({ data: { content: [] } })));
                tasks.push(getAllUsers({ role: 'JUDGE', active: true, size: 100 }).catch(() => ({ data: { content: [] } })));
            }

            const [summaryRes, casesRes, usersRes, judgesRes] = await Promise.all(tasks);

            setDashboardSummary(summaryRes?.data || null);
            setManagedCases(casesRes?.data?.content || []);
            setUsers(usersRes?.data?.content || []);
            setJudgeUsers(judgesRes?.data?.content || []);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [role]);

    const handleLookup = async () => {
        if (!lookupId.trim()) return;
        setLookupResult(null);
        setLookupError('');
        try {
            const res = await getCaseByNumber(lookupId.trim());
            setLookupResult(res.data);
        } catch (err) {
            setLookupError(err.response?.data?.message || 'Case not found.');
        }
    };

    const handleUserRoleChange = async (userId, nextRole) => {
        const submitKey = `user-role-${userId}`;
        setRowSubmitting(submitKey, true);
        try {
            await updateUserRole(userId, nextRole);
            await loadData({ showLoader: false });
            setMessage({ text: `Updated role to ${nextRole}.`, isError: false });
        } catch (err) {
            setMessage({ text: err.response?.data?.message || 'Unable to update user role.', isError: true });
        } finally {
            setRowSubmitting(submitKey, false);
        }
    };

    const handleUserStatusToggle = async (userId, active) => {
        const submitKey = `user-status-${userId}`;
        setRowSubmitting(submitKey, true);
        try {
            await updateUserStatus(userId, active);
            await loadData({ showLoader: false });
            setMessage({ text: active ? 'User activated.' : 'User deactivated.', isError: false });
        } catch (err) {
            setMessage({ text: err.response?.data?.message || 'Unable to update user status.', isError: true });
        } finally {
            setRowSubmitting(submitKey, false);
        }
    };

    const handleJudgeActionChange = (caseNumber, field, value) => {
        setJudgeActions((current) => ({
            ...current,
            [caseNumber]: {
                ...current[caseNumber],
                [field]: value,
            },
        }));
    };

    const handleAssignJudge = async (caseNumber) => {
        const judgeUsername = judgeActions[caseNumber]?.judgeUsername;
        const submitKey = `assign-${caseNumber}`;
        setRowSubmitting(submitKey, true);
        try {
            const res = await assignJudge(caseNumber, judgeUsername || undefined);
            await loadData({ showLoader: false });
            clearJudgeAction(caseNumber, 'judgeUsername');
            if (lookupResult?.caseNumber === caseNumber) {
                const lookupRes = await getCaseByNumber(caseNumber);
                setLookupResult(lookupRes.data);
            }
            setMessage({ text: res.data?.message || 'Judge assigned successfully.', isError: false });
        } catch (err) {
            setMessage({ text: err.response?.data?.message || 'Unable to assign judge.', isError: true });
        } finally {
            setRowSubmitting(submitKey, false);
        }
    };

    const handleCaseStatusUpdate = async (caseNumber) => {
        const nextStatus = judgeActions[caseNumber]?.status;
        if (!nextStatus) return;
        const submitKey = `status-${caseNumber}`;
        setRowSubmitting(submitKey, true);
        try {
            const res = await updateCaseStatus(caseNumber, nextStatus);
            await loadData({ showLoader: false });
            clearJudgeAction(caseNumber, 'status');
            if (lookupResult?.caseNumber === caseNumber) {
                const lookupRes = await getCaseByNumber(caseNumber);
                setLookupResult(lookupRes.data);
            }
            setMessage({ text: res.data?.message || 'Case status updated.', isError: false });
        } catch (err) {
            setMessage({ text: err.response?.data?.message || 'Unable to update case status.', isError: true });
        } finally {
            setRowSubmitting(submitKey, false);
        }
    };

    return (
        <motion.div
            className="dash-view active"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div>
                    <h3>{role === 'ADMIN' ? 'Admin Dashboard' : role === 'JUDGE' ? 'Judge Workbench' : 'Case Management'}</h3>
                    <p style={{ color: 'var(--text-gray)', marginTop: '0.4rem' }}>
                        {role === 'ADMIN'
                            ? 'Manage users, judges, and system-wide case oversight.'
                            : role === 'JUDGE'
                                ? 'Review assigned cases and move matters through the workflow.'
                                : 'Look up cases and review your latest activity.'}
                    </p>
                </div>
                <button className="outline-btn" onClick={() => loadData({ showLoader: false })} disabled={loading || refreshing}>
                    {refreshing ? 'Refreshing...' : 'Refresh Data'}
                </button>
            </div>

            {message.text && (
                <div className={`message ${message.isError ? 'error-msg' : 'success-msg'}`} style={{ marginTop: '1rem' }}>
                    {message.text}
                </div>
            )}

            <div className="dash-form-card" style={{ marginTop: '1rem' }}>
                <h4 style={{ marginBottom: '1rem' }}>Quick Case Lookup</h4>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div className="premium-search-container" style={{ maxWidth: '420px' }}>
                        <div className="premium-search-icon">🔍</div>
                        <input
                            type="text"
                            className="premium-search-input"
                            value={lookupId}
                            onChange={(event) => setLookupId(event.target.value)}
                            onKeyDown={(event) => event.key === 'Enter' && handleLookup()}
                            placeholder="Enter a case number"
                        />
                    </div>
                    <button className="auth-submit-btn" style={{ width: 'auto', marginTop: 0 }} onClick={handleLookup}>
                        Lookup
                    </button>
                </div>

                {lookupError && <p style={{ color: '#ef4444', marginTop: '0.8rem' }}>{lookupError}</p>}
                {lookupResult && (
                    <div className="dash-form-card" style={{ marginTop: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div>
                                <h4 style={{ marginBottom: '0.35rem' }}>{lookupResult.caseNumber}</h4>
                                <div style={{ color: 'var(--text-gray)' }}>{lookupResult.title || 'Untitled'}</div>
                            </div>
                            <StatusChip status={lookupResult.status} />
                        </div>
                        <div style={{ display: 'grid', gap: '0.5rem', marginTop: '1rem', color: 'var(--text-gray)', fontSize: '0.92rem' }}>
                            <div>Client: <strong style={{ color: 'var(--text-dark)' }}>{lookupResult.clientUsername || '—'}</strong></div>
                            <div>Judge: <strong style={{ color: 'var(--text-dark)' }}>{lookupResult.judgeUsername || 'Unassigned'}</strong></div>
                            <div>Last updated: <strong style={{ color: 'var(--text-dark)' }}>{formatDateTime(lookupResult.updatedAt)}</strong></div>
                        </div>
                        <Link to={`/dashboard/case/${lookupResult.caseNumber}`} className="outline-btn" style={{ display: 'inline-block', marginTop: '1rem' }}>
                            Open Case
                        </Link>
                    </div>
                )}
            </div>

            {dashboardSummary && (
                <div className="stats-row" style={{ marginTop: '1.5rem' }}>
                    {[
                        { title: 'Total Cases', value: dashboardSummary.totalCases, cls: 'blue-card' },
                        { title: 'Pending Actions', value: dashboardSummary.pendingActions, cls: 'light-blue-card' },
                        { title: 'Closed Cases', value: dashboardSummary.closedCases, cls: '' },
                    ].map((card) => (
                        <div key={card.title} className={`stat-card ${card.cls}`}>
                            <div className="stat-title">{card.title}</div>
                            <div className="stat-value">{card.value}</div>
                        </div>
                    ))}
                </div>
            )}

            <div className="dash-form-card" style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <div>
                        <h4 style={{ marginBottom: '0.35rem' }}>
                            {role === 'ADMIN' ? 'Case Oversight' : role === 'JUDGE' ? 'All Visible Cases' : 'Assigned Cases'}
                        </h4>
                        <p style={{ margin: 0, color: 'var(--text-gray)' }}>
                            {role === 'ADMIN'
                                ? 'Review recent cases and drive assignment or closure workflows.'
                                : role === 'JUDGE'
                                    ? 'Review every case in the system. Assigned matters are highlighted and remain the ones you can actively move forward.'
                                    : 'Quickly update the matters currently under your watch.'}
                        </p>
                    </div>
                </div>

                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Case</th>
                                <th>Client</th>
                                <th>Judge</th>
                                <th>Status</th>
                                {role === 'ADMIN' && <th>Assign Judge</th>}
                                {(role === 'ADMIN' || role === 'JUDGE') && <th>Update Status</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={role === 'ADMIN' ? 6 : 5} style={{ textAlign: 'center' }}>Loading...</td></tr>
                            ) : managedCases.length === 0 ? (
                                <tr><td colSpan={role === 'ADMIN' ? 6 : 5} style={{ textAlign: 'center' }}>No cases available.</td></tr>
                            ) : managedCases.map((courtCase) => {
                                const isAssignedToJudge = role === 'JUDGE' && courtCase.judgeUsername === user?.username;
                                return (
                                <tr
                                    key={courtCase.caseNumber}
                                    style={isAssignedToJudge ? { background: 'rgba(99, 155, 212, 0.12)' } : undefined}
                                >
                                    <td>
                                        <Link to={`/dashboard/case/${courtCase.caseNumber}`}>{courtCase.caseNumber}</Link>
                                        {isAssignedToJudge && (
                                            <div style={{ marginTop: '0.3rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--button-blue)' }}>
                                                ASSIGNED TO YOU
                                            </div>
                                        )}
                                    </td>
                                    <td>{courtCase.clientUsername || '—'}</td>
                                    <td>{courtCase.judgeUsername || 'Unassigned'}</td>
                                    <td><StatusChip status={courtCase.status} /></td>
                                    {role === 'ADMIN' && (
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <select
                                                    value={judgeActions[courtCase.caseNumber]?.judgeUsername ?? courtCase.judgeUsername ?? ''}
                                                    onChange={(event) => handleJudgeActionChange(courtCase.caseNumber, 'judgeUsername', event.target.value)}
                                                    style={{ minWidth: '150px' }}
                                                >
                                                    <option value="">Select judge</option>
                                                    {judgeUsers.map((judge) => (
                                                        <option key={judge.id} value={judge.username}>{judge.username}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    className="outline-btn"
                                                    onClick={() => handleAssignJudge(courtCase.caseNumber)}
                                                    disabled={submitting[`assign-${courtCase.caseNumber}`]}
                                                >
                                                    {submitting[`assign-${courtCase.caseNumber}`] ? 'Saving...' : 'Assign'}
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                    {(role === 'ADMIN' || role === 'JUDGE') && (
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <select
                                                    value={judgeActions[courtCase.caseNumber]?.status || ''}
                                                    onChange={(event) => handleJudgeActionChange(courtCase.caseNumber, 'status', event.target.value)}
                                                    style={{ minWidth: '150px' }}
                                                >
                                                    <option value="">Next status</option>
                                                    {(courtCase.allowedNextStatuses || []).map((status) => (
                                                        <option key={status} value={status}>{status}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    className="outline-btn"
                                                    onClick={() => handleCaseStatusUpdate(courtCase.caseNumber)}
                                                    disabled={!judgeActions[courtCase.caseNumber]?.status || submitting[`status-${courtCase.caseNumber}`]}
                                                >
                                                    {submitting[`status-${courtCase.caseNumber}`] ? 'Saving...' : 'Update'}
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>

            {role === 'ADMIN' && (
                <div
                    style={{
                        display: 'grid',
                        gap: '1.5rem',
                        gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)',
                        marginTop: '1.5rem',
                    }}
                >
                    <div className="dash-form-card">
                        <h4 style={{ marginBottom: '1rem' }}>User Role Management</h4>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Username</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length === 0 ? (
                                        <tr><td colSpan="4" style={{ textAlign: 'center' }}>No users found.</td></tr>
                                    ) : users.map((userRecord) => (
                                        <tr key={userRecord.id}>
                                            <td>{userRecord.username}</td>
                                            <td>{userRecord.email}</td>
                                            <td>
                                                <select
                                                    value={userRecord.role}
                                                    onChange={(event) => handleUserRoleChange(userRecord.id, event.target.value)}
                                                    disabled={submitting[`user-role-${userRecord.id}`] || submitting[`user-status-${userRecord.id}`]}
                                                >
                                                    {['CLIENT', 'LAWYER', 'JUDGE', 'ADMIN'].map((roleOption) => (
                                                        <option key={roleOption} value={roleOption}>{roleOption}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <button
                                                    className="outline-btn"
                                                    onClick={() => handleUserStatusToggle(userRecord.id, !userRecord.active)}
                                                    disabled={submitting[`user-role-${userRecord.id}`] || submitting[`user-status-${userRecord.id}`]}
                                                >
                                                    {submitting[`user-status-${userRecord.id}`]
                                                        ? 'Saving...'
                                                        : userRecord.active ? 'Deactivate' : 'Activate'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="dash-form-card">
                        <h4 style={{ marginBottom: '1rem' }}>Judge Management</h4>
                        {judgeUsers.length === 0 ? (
                            <p>No active judges available.</p>
                        ) : (
                            <div style={{ display: 'grid', gap: '0.85rem' }}>
                                {judgeUsers.map((judge) => (
                                    <div
                                        key={judge.id}
                                        style={{
                                            padding: '0.95rem 1rem',
                                            borderRadius: '14px',
                                            background: 'rgba(15, 23, 42, 0.03)',
                                            border: '1px solid rgba(15, 23, 42, 0.08)',
                                        }}
                                    >
                                        <div style={{ fontWeight: 600 }}>{judge.username}</div>
                                        <div style={{ color: 'var(--text-gray)', fontSize: '0.9rem', marginTop: '0.25rem' }}>{judge.email}</div>
                                        <div style={{ color: 'var(--text-gray)', fontSize: '0.84rem', marginTop: '0.35rem' }}>
                                            Created: {formatDateTime(judge.createdAt)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </motion.div>
    );
}
