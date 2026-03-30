import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function LogoutPage() {
    const navigate = useNavigate();

    return (
        <div className="auth-container">
            <motion.div
                className="auth-box center-box"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
            >
                <div className="logout-icon-container">
                    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="20" y="28" width="24" height="20" rx="4" fill="#3B82F6" />
                        <path d="M24 28V22C24 17.5817 27.5817 14 32 14C36.4183 14 40 17.5817 40 22V28" stroke="#3B82F6" strokeWidth="4" strokeLinecap="round" />
                        <path d="M28 38L32 42L36 34" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <h3 className="logout-title">YOU HAVE BEEN SUCCESSFULLY LOGGED OUT</h3>
                <p className="logout-subtitle">Your session has securely terminated.</p>
                <div className="logout-buttons">
                    <button className="dark-btn flex-1" onClick={() => navigate('/login')}>LOGIN AGAIN</button>
                    <button className="outline-btn flex-1" onClick={() => navigate('/')}>GO TO HOME</button>
                </div>
            </motion.div>
        </div>
    );
}
