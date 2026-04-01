import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    completePasswordReset,
    requestPasswordResetOtp,
    verifyPasswordResetOtp,
} from '../services/api';

export default function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [verificationTicket, setVerificationTicket] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [verified, setVerified] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleRequestOtp = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const res = await requestPasswordResetOtp({ email });
            setOtpSent(true);
            setSuccess(res.data?.message || 'OTP sent to your email.');
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to send reset OTP.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const res = await verifyPasswordResetOtp({ email, otp });
            setVerificationTicket(res.data?.verificationTicket || '');
            setVerified(true);
            setSuccess(res.data?.message || 'OTP verified successfully.');
        } catch (err) {
            setError(err.response?.data?.message || 'OTP verification failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const res = await completePasswordReset({
                email,
                password,
                confirmPassword,
                verificationTicket,
            });
            setSuccess(res.data?.message || 'Password reset successful. Redirecting to login...');
            setTimeout(() => navigate('/login'), 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Password reset failed.');
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
                <h2>RESET PASSWORD</h2>
                <p className="subtitle">Verify your email with OTP before changing the password</p>

                <form onSubmit={verified ? handleResetPassword : otpSent ? handleVerifyOtp : handleRequestOtp} className="reg-form">
                    <div className="input-container">
                        <label>Email Address</label>
                        <input
                            type="email"
                            placeholder="Enter your registered email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={otpSent}
                            required
                        />
                    </div>

                    {!otpSent && (
                        <button type="submit" className="auth-submit-btn dark-btn" disabled={loading}>
                            {loading ? 'Sending OTP...' : 'Send Reset OTP'}
                        </button>
                    )}

                    {otpSent && !verified && (
                        <>
                            <div className="input-container">
                                <label>OTP</label>
                                <input
                                    type="text"
                                    placeholder="Enter the 6-digit OTP"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    required
                                />
                            </div>
                            <button type="submit" className="auth-submit-btn dark-btn" disabled={loading}>
                                {loading ? 'Verifying...' : 'Verify OTP'}
                            </button>
                        </>
                    )}

                    {verified && (
                        <>
                            <div className="input-container">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    placeholder="Minimum 8 characters, with letters and numbers"
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
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </>
                    )}

                    {success && <div className="success-msg">{success}</div>}
                    {error && <div className="error-msg">{error}</div>}
                </form>

                <div className="auth-footer">
                    Remembered your password? <a href="#" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Back to login</a>
                </div>
            </motion.div>
        </div>
    );
}
