import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { register as registerApi } from '../services/api';

export default function RegisterPage() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('CLIENT');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        try {
            await registerApi(username, email, password, role);
            setSuccess('Registration successful! Redirecting to login...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <motion.div
                className="auth-box center-box"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
            >
                <h2>USER REGISTRATION</h2>
                <p className="subtitle">Create your case information securely</p>

                <form onSubmit={handleSubmit} className="reg-form">
                    <div className="input-container">
                        <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                    </div>
                    <div className="input-container">
                        <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="input-container">
                        <input type="password" placeholder="Minimum 8 characters, with letters and numbers" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <div className="input-container">
                        <select value={role} onChange={(e) => setRole(e.target.value)} required>
                            <option value="CLIENT">Client</option>
                            <option value="LAWYER">Lawyer</option>
                        </select>
                    </div>
                    <button type="submit" className="auth-submit-btn dark-btn" disabled={loading}>
                        {loading ? 'Registering...' : 'Register'}
                    </button>
                    {success && <div className="success-msg">{success}</div>}
                    {error && <div className="error-msg">{error}</div>}
                </form>

                <div className="auth-footer">
                    Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Login here</a>
                </div>
            </motion.div>
        </div>
    );
}
