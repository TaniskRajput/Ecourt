import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { getCaseByNumber, getAllUsers, assignJudge, updateCaseStatus } from '../../services/api';

export default function ManageCases() {
    const { user } = useAuth();
    const role = user?.role || '';

    // Quick lookup
    const [lookupId, setLookupId] = useState('');
    const [lookupResult, setLookupResult] = useState(null);
    const [lookupColor, setLookupColor] = useState('var(--primary-blue)');

    // Admin
    const [usersResult, setUsersResult] = useState(null);

    // Judge
    const [judgeCaseId, setJudgeCaseId] = useState('');
    const [judgeMessage, setJudgeMessage] = useState({ text: '', isError: false });

    const handleLookup = async () => {
        if (!lookupId) return;
        setLookupResult(null);
        try {
            const res = await getCaseByNumber(lookupId);
            setLookupResult({ type: 'success', data: res.data });
        } catch (err) {
            setLookupResult({ type: 'error', data: err.response?.data?.message || 'Case not found.' });
        }
    };

    const handleLoadUsers = async () => {
        setUsersResult(null);
        try {
            const res = await getAllUsers();
            setUsersResult({ type: 'success', data: res.data });
        } catch (err) {
            setUsersResult({ type: 'error', data: err.response?.data?.message || 'Unable to load users.' });
        }
    };

    const handleAssignJudge = async () => {
        if (!judgeCaseId) return;
        try {
            const res = await assignJudge(judgeCaseId);
            setJudgeMessage({ text: res.data?.message || 'Judge assigned successfully.', isError: false });
        } catch (err) {
            setJudgeMessage({ text: err.response?.data?.message || 'Unable to assign case.', isError: true });
        }
    };

    const handleCloseCase = async () => {
        if (!judgeCaseId) return;
        try {
            const res = await updateCaseStatus(judgeCaseId, 'CLOSED');
            setJudgeMessage({ text: res.data?.message || 'Case closed successfully.', isError: false });
        } catch (err) {
            setJudgeMessage({ text: err.response?.data?.message || 'Unable to close case.', isError: true });
        }
    };

    return (
        <motion.div
            className="dash-view active"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <h3>Quick Case Lookup</h3>
            <div className="dash-form-card">
                <div className="search-row">
                    <input type="text" value={lookupId} onChange={(e) => setLookupId(e.target.value)} placeholder="Enter Case Number" />
                    <button className="auth-submit-btn" onClick={handleLookup}>Lookup</button>
                </div>
                {lookupResult && lookupResult.type === 'error' && (
                    <motion.div className="result-box" style={{ borderLeftColor: '#ef4444', color: '#ef4444' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {lookupResult.data}
                    </motion.div>
                )}
                {lookupResult && lookupResult.type === 'success' && (
                    <motion.div className="dash-form-card" style={{ marginTop: '15px', borderLeft: '4px solid #22c55e', padding: '20px' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <h4 style={{ marginBottom: '15px', color: 'var(--primary-dark)' }}>Case: {lookupResult.data.caseNumber}</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div><strong>Title:</strong> {lookupResult.data.title || 'N/A'}</div>
                            <div><strong>Status:</strong> <span style={{ fontWeight: 'bold', color: 'var(--primary-blue)' }}>{lookupResult.data.status}</span></div>
                            <div><strong>Client:</strong> {lookupResult.data.clientUsername || 'N/A'}</div>
                            <div><strong>Judge:</strong> {lookupResult.data.judgeUsername || 'Unassigned'}</div>
                            <div><strong>Lawyer:</strong> {lookupResult.data.lawyerUsername || 'N/A'}</div>
                            <div><strong>Filed Date:</strong> {lookupResult.data.filedDate ? new Date(lookupResult.data.filedDate).toLocaleDateString() : 'N/A'}</div>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Admin User Management */}
            {role === 'ADMIN' && (
                <div style={{ marginTop: '2rem' }}>
                    <h3>Admin Controls</h3>
                    <button className="auth-submit-btn dark-btn" onClick={handleLoadUsers}>Load All Users</button>
                    {usersResult && usersResult.type === 'error' && (
                        <motion.div className="result-box mt-3" style={{ borderLeftColor: '#ef4444', color: '#ef4444' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            {usersResult.data}
                        </motion.div>
                    )}
                    {usersResult && usersResult.type === 'success' && (
                        <motion.div className="table-container scrollable-table-container" style={{ marginTop: '20px', maxHeight: '400px', overflowY: 'auto' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Username</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Created At</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(Array.isArray(usersResult.data) ? usersResult.data : usersResult.data?.content || []).map((u) => (
                                        <tr key={u.id}>
                                            <td>{u.id}</td>
                                            <td style={{ fontWeight: '600' }}>{u.username}</td>
                                            <td>{u.email}</td>
                                            <td><span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: '#e2e8f0', fontWeight: 'bold' }}>{u.role}</span></td>
                                            <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </motion.div>
                    )}
                </div>
            )}

            {/* Judge Actions */}
            {role === 'JUDGE' && (
                <div style={{ marginTop: '2rem' }}>
                    <h3>Judge Actions</h3>
                    <div className="input-container">
                        <input type="text" value={judgeCaseId} onChange={(e) => setJudgeCaseId(e.target.value)} placeholder="Case Number to Act On" />
                    </div>
                    <div className="flex-row" style={{ marginTop: '10px' }}>
                        <button className="auth-submit-btn" onClick={handleAssignJudge}>Assign To Me</button>
                        <button className="auth-submit-btn danger-btn" onClick={handleCloseCase}>Close Case</button>
                    </div>
                    {judgeMessage.text && (
                        <div className={`message ${judgeMessage.isError ? 'error-msg' : 'success-msg'}`}>
                            {judgeMessage.text}
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}
