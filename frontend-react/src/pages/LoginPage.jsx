import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { beginGoogleAuth, login as loginApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleBusy, setGoogleBusy] = useState(false);
    const navigate = useNavigate();
    const { loginUser } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await loginApi(identifier, password);
            loginUser(res.data);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Check credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setGoogleBusy(true);
        setError('');
        try {
            await beginGoogleAuth({ credential: 'device-google-account' });
        } catch (err) {
            setError(err.response?.data?.message || 'Google sign-in is not available yet.');
        } finally {
            setGoogleBusy(false);
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
                <h2>USER LOGIN</h2>
                <p className="subtitle">Access your verified account securely</p>

                <div className="auth-form-container">
                    <div className="auth-icon">
                        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="64" height="64" rx="32" fill="#EBF4FB" />
                            <path d="M32 15V45" stroke="#71A0CD" strokeWidth="2" strokeLinecap="round" />
                            <path d="M22 45H42" stroke="#71A0CD" strokeWidth="2" strokeLinecap="round" />
                            <path d="M32 20L15 28L49 28" stroke="#71A0CD" strokeWidth="2" strokeLinejoin="round" />
                            <path d="M15 28L15 35C15 38 18 41 22 41C26 41 29 38 29 35L29 28" stroke="#71A0CD" strokeWidth="2" />
                            <path d="M49 28L49 35C49 38 46 41 42 41C38 41 35 38 35 35L35 28" stroke="#71A0CD" strokeWidth="2" />
                        </svg>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="input-container">
                            <input
                                type="text"
                                placeholder="Email or Username"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                required
                            />
                        </div>
                        <div className="input-container">
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="auth-submit-btn" disabled={loading}>
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                        <button type="button" className="outline-btn" onClick={handleGoogleSignIn} disabled={googleBusy}>
                            {googleBusy ? 'Checking Google Sign-In...' : 'Continue with Google'}
                        </button>
                        <div className="auth-inline-link">
                            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/forgot-password'); }}>
                                Forgot password?
                            </a>
                        </div>
                        {error && <div className="error-msg">{error}</div>}
                    </form>
                </div>

                <div className="auth-footer">
                    New user? <a href="#" onClick={(e) => { e.preventDefault(); navigate('/register'); }}>Register here</a>
                </div>
            </motion.div>
        </div>
    );
}
