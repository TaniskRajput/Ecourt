import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { searchPublicCases } from '../services/api';

export default function LandingPage() {
    const navigate = useNavigate();
    const [caseNumber, setCaseNumber] = useState('');
    const [year, setYear] = useState('');
    const [courtName, setCourtName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async (event) => {
        event?.preventDefault?.();
        setLoading(true);
        setError('');
        try {
            const params = {};
            if (caseNumber.trim()) params.caseNumber = caseNumber.trim();
            if (year) params.year = Number.parseInt(year, 10);
            if (courtName.trim()) params.courtName = courtName.trim();

            const response = await searchPublicCases(params);

            if (response.data && response.data.length > 0) {
                navigate(`/track-case/${response.data[0].caseNumber}`);
            } else {
                setError('No cases found matching your criteria.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to search cases right now.');
        } finally {
            setLoading(false);
        }
    };

    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 10 }, (_, index) => String(currentYear - index));

    return (
        <div className="landing-page-container">
            <div className="landing-hero-section">
                <motion.div
                    className="hero-text-container"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1>Track Your Case / अपना केस ट्रैक करें</h1>
                    <p>
                        Enter your case details below to view hearing history and court orders /
                        सुनवाई का इतिहास और अदालत के आदेश देखने के लिए नीचे अपने केस का विवरण दर्ज करें
                    </p>
                </motion.div>

                <motion.div
                    className="hero-search-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <form className="hero-search-form" onSubmit={handleSearch}>
                        <div className="search-inputs-grid">
                            <div className="input-group">
                                <label>CASE NUMBER / केस संख्या</label>
                                <div className="input-with-icon">
                                    <span className="search-icon">🔍</span>
                                    <input
                                        type="text"
                                        value={caseNumber}
                                        onChange={(e) => setCaseNumber(e.target.value)}
                                        placeholder="e.g., 2024-001234 or 270301015123..."
                                    />
                                </div>
                            </div>
                            <div className="input-group">
                                <label>YEAR / वर्ष</label>
                                <select value={year} onChange={(e) => setYear(e.target.value)}>
                                    <option value="">Year</option>
                                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div className="input-group">
                                <label>COURT NAME / अदालत</label>
                                <select value={courtName} onChange={(e) => setCourtName(e.target.value)}>
                                    <option value="">All Courts</option>
                                    <option value="District Court">District Court</option>
                                    <option value="High Court">High Court</option>
                                    <option value="Supreme Court">Supreme Court</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit" className="hero-search-btn" disabled={loading}>
                            {loading ? 'SEARCHING...' : '🔍 SEARCH CASE / केस खोजें'}
                        </button>
                    </form>
                    {error && <div className="error-msg-hero">{error}</div>}
                </motion.div>
            </div>

            <div className="landing-features-section">
                <div className="feature-cards-container">
                    <motion.div className="feature-card" whileHover={{ y: -5 }}>
                        <div className="feature-icon" style={{ color: '#4B70F5', backgroundColor: '#E0E8FF' }}>📅</div>
                        <h3>View Hearings</h3>
                        <p>Check upcoming and past hearing schedules. Stay informed about when your case is listed before the honorable bench.</p>
                    </motion.div>
                    <motion.div className="feature-card" whileHover={{ y: -5 }}>
                        <div className="feature-icon" style={{ color: '#4B70F5', backgroundColor: '#E0E8FF' }}>📄</div>
                        <h3>Download Orders</h3>
                        <p>Access public court orders and judgments directly. Securely download digitally signed copies for your legal reference.</p>
                    </motion.div>
                    <motion.div className="feature-card" whileHover={{ y: -5 }}>
                        <div className="feature-icon" style={{ color: '#4B70F5', backgroundColor: '#E0E8FF' }}>📈</div>
                        <h3>Track Progress</h3>
                        <p>Monitor the real-time status of your case. Receive instant updates on filing status, objections, and disposal details.</p>
                    </motion.div>
                </div>
            </div>

            <div className="landing-info-section">
                <div className="info-content-container">
                    <div className="info-text">
                        <h2>Transparency through Digitization</h2>
                        <p>
                            The E-Court portal provides a unified interface for litigants and legal
                            professionals to access judicial information seamlessly. By integrating
                            technology with the legal process, we ensure that justice is not only done but
                            is seen to be done.
                        </p>
                        <ul className="info-bullets">
                            <li><span className="check-icon">✓</span> Real-time sync with National Judicial Data Grid</li>
                            <li><span className="check-icon">✓</span> Bilingual support for better citizen reach</li>
                            <li><span className="check-icon">✓</span> Secure access to sensitive legal documentation</li>
                        </ul>
                    </div>
                    <div className="info-image">
                        {/* A generic reliable placeholder since we do not have local image */}
                        <img src="https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=800" alt="Supreme Court Placeholder" />
                    </div>
                </div>
            </div>
        </div>
    );
}
