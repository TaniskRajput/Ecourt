import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
    const { user } = useAuth();
    const navigate = useNavigate();

    return (
        <nav className="main-nav">
            <div className="nav-links">
                <a href="#" className="nav-item active" onClick={(e) => { e.preventDefault(); navigate('/'); }}>Home</a>
                <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate('/track-case'); }}>Track Case</a>
                <a href="#" className="nav-item" onClick={(e) => e.preventDefault()}>Cause List</a>
                <a href="#" className="nav-item" onClick={(e) => e.preventDefault()}>About Us</a>
            </div>
            {!user && (
                <div className="auth-buttons">
                    <button className="nav-btn btn-outline" onClick={() => navigate('/login')}>LOGIN</button>
                    <button className="nav-btn btn-solid" onClick={() => navigate('/register')}>REGISTER</button>
                </div>
            )}
        </nav>
    );
}
