import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { register, beginGoogleAuth } from '../services/api';

export default function RegisterPage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('CLIENT');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleBusy, setGoogleBusy] = useState(false);

    const handleRegister = async (event) => {
        event.preventDefault();
        
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const res = await register(username, email, password, role);
            setSuccess(res.data?.message || 'Registration successful. Redirecting to login...');
            setTimeout(() => navigate('/login'), 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        setGoogleBusy(true);
        setError('');
        setSuccess('');
        try {
            await beginGoogleAuth({ credential: 'device-google-account' });
            setSuccess('Google sign-in is available.');
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
                <h2>USER REGISTRATION</h2>
                <p className="subtitle">Fill in your details to create an account</p>

                <form onSubmit={handleRegister} className="reg-form">
                    <div className="input-container">
                        <label>Username</label>
                        <input
                            type="text"
                            placeholder="Choose a username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-container">
                        <label>Email Address</label>
                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-container">
                        <label>Account Type</label>
                        <select value={role} onChange={(e) => setRole(e.target.value)} required>
                            <option value="CLIENT">Client</option>
                            <option value="LAWYER">Lawyer</option>
                        </select>
                    </div>

                    <div className="input-container">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="Minimum 8 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-container">
                        <label>Confirm Password</label>
                        <input
                            type="password"
                            placeholder="Re-enter your password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="auth-submit-btn dark-btn" disabled={loading}>
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>

                    <button type="button" className="outline-btn" onClick={handleGoogleSignup} disabled={googleBusy}>
                        {googleBusy ? 'Checking Google Sign-In...' : 'Continue with Google'}
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
