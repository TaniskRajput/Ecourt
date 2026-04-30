import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiMenu, FiX } from 'react-icons/fi';

export default function Navbar() {
    const { user, logoutUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const portalLabel = user ? `${user.role.toUpperCase()} PORTAL` : 'PUBLIC PORTAL';

    const isLoginPage = location.pathname === '/login';
    const isRegisterPage = location.pathname === '/register';

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    return (
        <nav className="main-nav">
            <div className="nav-left-section clickable" onClick={() => navigate('/')}>
                <h2>Case Management</h2>
                <div className="portal-subtitle">{portalLabel}</div>
            </div>
            
            <div className="nav-links-container">
                <div className="hamburger-wrapper">
                    <div className="hamburger-icon" onClick={toggleMenu}>
                        {isMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
                    </div>
                    {isMenuOpen && (
                        <div className="hamburger-dropdown">
                            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate('/track-case'); setIsMenuOpen(false); }}>Track Case</a>
                            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); setIsMenuOpen(false); }}>Cause List</a>
                            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); setIsMenuOpen(false); }}>Judgments</a>
                            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); setIsMenuOpen(false); }}>Help Desk</a>
                        </div>
                    )}
                </div>

                <div className="nav-right-actions">
                    <div className="lang-switch">English / हिन्दी</div>
                    {user ? (
                        <div className="sign-in-link" onClick={() => { logoutUser(); navigate('/login'); }}>Logout ({user.username})</div>
                    ) : isLoginPage ? (
                        <div className="sign-in-link" onClick={() => navigate('/register')}>Sign Up</div>
                    ) : isRegisterPage ? (
                        <div className="sign-in-link" onClick={() => navigate('/login')}>Sign In</div>
                    ) : (
                        <div className="sign-in-link" onClick={() => navigate('/login')}>Sign In</div>
                    )}
                </div>
            </div>
        </nav>
    );
}
