import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Header() {
    const navigate = useNavigate();
    const location = useLocation();
    const [dateTime, setDateTime] = useState('');

    // Hide back button on landing/login/register pages
    const isLandingPage = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register';

    useEffect(() => {
        const update = () => {
            const now = new Date();
            const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const date = now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
            setDateTime(`${time} | ${date}`);
        };
        update();
        const interval = setInterval(update, 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <header className="top-header">
            <div className="header-content">
                <div className="logo-section">
                    {!isLandingPage && (
                        <button
                            className="global-back-btn"
                            onClick={() => navigate(-1)}
                            title="Go Back"
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none">
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                            <span>BACK</span>
                        </button>
                    )}
                    <div className="emblem-placeholder">
                        <svg viewBox="0 0 100 100" fill="white" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="50" cy="50" r="45" stroke="white" strokeWidth="2" fill="none" />
                            <path d="M30,40 Q50,20 70,40 Q50,60 30,40" fill="white" />
                            <rect x="40" y="60" width="20" height="20" fill="white" />
                            <text x="50" y="90" fontSize="8" textAnchor="middle" fill="white">सत्यमेव जयते</text>
                        </svg>
                    </div>
                    <h1>E-COURT CASE TRACKER</h1>
                </div>
                <div className="datetime-section">
                    <div className="datetime-text">{dateTime}</div>
                    <div className="language-text">ENGLISH / हिन्दी</div>
                </div>
            </div>
        </header>
    );
}
