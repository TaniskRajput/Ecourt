import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AccessDeniedModal({ show, onClose }) {
    const navigate = useNavigate();
    const { logoutUser } = useAuth();

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    className="modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ display: 'flex' }}
                >
                    <motion.div
                        className="modal-content warning-modal"
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.7, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    >
                        <div className="warning-icon">
                            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M32 4L4 60H60L32 4Z" fill="#D32F2F" />
                                <path d="M32 20V40" stroke="white" strokeWidth="6" strokeLinecap="round" />
                                <circle cx="32" cy="50" r="4" fill="white" />
                            </svg>
                        </div>
                        <h3 className="modal-title">ACCESS DENIED</h3>
                        <p className="modal-text">
                            You do not have permission to access the given page. Please contact an
                            administrator for assistance or log in with a different account.
                        </p>
                        <div className="modal-buttons">
                            <button className="dark-btn flex-1" onClick={onClose}>GO TO DASHBOARD</button>
                            <button className="outline-btn flex-1" onClick={() => { logoutUser(); navigate('/login'); }}>LOG IN AGAIN</button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
