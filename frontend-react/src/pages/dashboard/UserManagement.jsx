import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getAllUsers, createUser, updateUserStatus } from '../../services/api';
import { FiUserPlus, FiUsers, FiCheckCircle, FiXCircle } from 'react-icons/fi';

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // New Judge Form State
    const [showAddForm, setShowAddForm] = useState(false);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('JUDGE');

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await getAllUsers();
            setUsers(res.data.users || []);
        } catch (err) {
            console.error('Failed to fetch users', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleAddJudge = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setError('');
        setSuccess('');
        try {
            await createUser({ username, email, password, role });
            setSuccess(`Judge ${username} created successfully!`);
            setShowAddForm(false);
            setUsername('');
            setEmail('');
            setPassword('');
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create judge account.');
        } finally {
            setFormLoading(false);
        }
    };

    const toggleUserStatus = async (userId, currentStatus) => {
        try {
            await updateUserStatus(userId, !currentStatus);
            fetchUsers();
        } catch (err) {
            alert('Failed to update user status');
        }
    };

    return (
        <motion.div 
            className="dash-view active"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                    <h3>User Management</h3>
                    <p style={{ color: 'var(--text-gray)', marginTop: '0.4rem' }}>Manage system users and provision administrative accounts</p>
                </div>
                <button className="outline-btn" onClick={() => setShowAddForm(!showAddForm)}>
                    <FiUserPlus style={{ marginRight: '8px' }} /> {showAddForm ? 'View User List' : 'Add New Judge'}
                </button>
            </div>

            {showAddForm ? (
                <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                >
                    <div className="dash-form-card">
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ marginBottom: '0.35rem' }}>Register New Judge</h4>
                            <p style={{ color: 'var(--text-gray)', margin: 0 }}>Provision a new judicial account with full system access</p>
                        </div>
                        <form onSubmit={handleAddJudge}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="input-container">
                                    <label>Username</label>
                                    <input 
                                        type="text" 
                                        value={username} 
                                        onChange={(e) => setUsername(e.target.value)} 
                                        placeholder="e.g. judge_sharma"
                                        required 
                                    />
                                </div>
                                <div className="input-container">
                                    <label>Email Address</label>
                                    <input 
                                        type="email" 
                                        value={email} 
                                        onChange={(e) => setEmail(e.target.value)} 
                                        placeholder="judge@ecourt.gov.in"
                                        required 
                                    />
                                </div>
                                <div className="input-container">
                                    <label>Temporary Password</label>
                                    <input 
                                        type="password" 
                                        value={password} 
                                        onChange={(e) => setPassword(e.target.value)} 
                                        placeholder="Min 8 characters"
                                        required 
                                    />
                                </div>
                                <div className="input-container">
                                    <label>System Role</label>
                                    <select value={role} onChange={(e) => setRole(e.target.value)}>
                                        <option value="JUDGE">Judge</option>
                                        <option value="ADMIN">Administrator</option>
                                        <option value="LAWYER">Lawyer</option>
                                        <option value="CLIENT">Client</option>
                                    </select>
                                </div>
                            </div>

                            {error && <div className="error-msg" style={{ marginTop: '20px' }}>{error}</div>}
                            {success && <div className="success-msg" style={{ marginTop: '20px' }}>{success}</div>}

                            <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                                <button type="submit" className="auth-submit-btn dark-btn" style={{ width: 'auto', margin: 0 }} disabled={formLoading}>
                                    {formLoading ? 'Provisioning Account...' : 'Create Judge Account'}
                                </button>
                                <button type="button" className="outline-btn" style={{ width: 'auto', padding: '12px 20px' }} onClick={() => setShowAddForm(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            ) : (
                <div className="dash-form-card">
                    <div className="table-container">
                        {loading ? (
                            <div className="loading-state">Loading users...</div>
                        ) : (
                            <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id}>
                                        <td>
                                            <div className="case-id-cell">
                                                <FiUsers />
                                                <span>{u.username}</span>
                                            </div>
                                        </td>
                                        <td>{u.email}</td>
                                        <td>
                                            <span className={`status-badge status-${u.role.toLowerCase()}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td>
                                            {u.active ? (
                                                <span className="text-success" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <FiCheckCircle /> Active
                                                </span>
                                            ) : (
                                                <span className="text-danger" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <FiXCircle /> Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <button 
                                                className="outline-btn"
                                                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                                                onClick={() => toggleUserStatus(u.id, u.active)}
                                            >
                                                {u.active ? 'Deactivate' : 'Activate'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    </div>
                </div>
            )}
        </motion.div>

    );
}
