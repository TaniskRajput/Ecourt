import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { searchPublicCases } from '../services/api';

const RECENT_STORAGE_KEY = 'ecourt_recent_case_searches';

function formatDate(value) {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}

function loadRecentSearches() {
    try {
        return JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
}

export default function TrackCasePage() {
    const navigate = useNavigate();
    const [caseNumber, setCaseNumber] = useState('');
    const [year, setYear] = useState('');
    const [courtName, setCourtName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [results, setResults] = useState([]);
    const [recentSearches, setRecentSearches] = useState([]);

    useEffect(() => {
        setRecentSearches(loadRecentSearches());
    }, []);

    const persistRecentSearch = (item) => {
        const nextItems = [
            item,
            ...recentSearches.filter((existing) => existing.caseNumber !== item.caseNumber),
        ].slice(0, 3);
        setRecentSearches(nextItems);
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(nextItems));
    };

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
            setResults(response.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to search cases right now.');
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const openCase = (item) => {
        persistRecentSearch(item);
        navigate(`/track-case/${item.caseNumber}`);
    };

    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 6 }, (_, index) => String(currentYear - index));

    return (
        <motion.section
            className="public-page-shell"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
        >
            <div className="public-page-card track-search-card">
                <h1>Find Your Case</h1>
                <p>Enter your case details to retrieve status, hearing history, and court orders.</p>

                <form className="track-search-form" onSubmit={handleSearch}>
                    <div className="track-search-row">
                        <input
                            type="text"
                            value={caseNumber}
                            onChange={(event) => setCaseNumber(event.target.value)}
                            placeholder="Case Number"
                        />
                        <button type="submit" className="auth-submit-btn" disabled={loading}>
                            {loading ? 'Searching...' : 'Search'}
                        </button>
                    </div>

                    <div className="track-filter-row">
                        <select value={year} onChange={(event) => setYear(event.target.value)}>
                            <option value="">Year</option>
                            {yearOptions.map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            value={courtName}
                            onChange={(event) => setCourtName(event.target.value)}
                            placeholder="Court (Optional)"
                        />
                    </div>
                </form>

                {error && <div className="error-msg" style={{ marginTop: '1rem' }}>{error}</div>}

                {results.length > 0 && (
                    <div className="public-section-block">
                        <div className="public-section-title">Search Results</div>
                        <div className="track-results-grid">
                            {results.map((item) => (
                                <article key={item.caseNumber} className="track-result-card">
                                    <h3>{item.caseNumber}</h3>
                                    <p>{item.title || 'Untitled case'}</p>
                                    <div className="track-result-meta">{item.caseSummary}</div>
                                    <div className="track-result-meta">Filed: {formatDate(item.filedDate)}</div>
                                    <button className="outline-btn" onClick={() => openCase(item)}>View Details</button>
                                </article>
                            ))}
                        </div>
                    </div>
                )}

                <div className="public-section-block">
                    <div className="public-section-title">Recent Searches</div>
                    {recentSearches.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">🔎</div>
                            <p>Your recent tracked cases will appear here.</p>
                        </div>
                    ) : (
                        <div className="track-results-grid">
                            {recentSearches.map((item) => (
                                <article key={item.caseNumber} className="track-result-card">
                                    <h3>{item.caseNumber}</h3>
                                    <p>{item.title || 'Untitled case'}</p>
                                    <div className="track-result-meta">{item.caseSummary}</div>
                                    <div className="track-result-meta">Updated: {formatDate(item.updatedAt)}</div>
                                    <button className="outline-btn" onClick={() => navigate(`/track-case/${item.caseNumber}`)}>
                                        View Details
                                    </button>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </motion.section>
    );
}
