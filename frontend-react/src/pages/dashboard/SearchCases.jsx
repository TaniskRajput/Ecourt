import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { searchCases } from '../../services/api';
import StatusChip from '../../components/StatusChip';

const SEARCH_MODES = [
    { value: 'query', label: '🔍 Case Number / Title' },
    { value: 'client', label: '👤 Client Username' },
    { value: 'lawyer', label: '⚖️ Lawyer Username' },
    { value: 'judge', label: '🏛️ Judge Username' },
    { value: 'status', label: '📋 Case Status' },
    { value: 'date', label: '📅 Filed Date' },
];

export default function SearchCases() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const role = user?.role || '';

    const showAllScope = ['ADMIN', 'JUDGE'].includes(role);

    // Modes that logically imply searching across ALL cases (not just my own)
    const crossUserModes = ['client', 'lawyer', 'judge'];

    const [scope, setScope] = useState('my');
    const [searchMode, setSearchMode] = useState('query');
    const [inputValue, setInputValue] = useState('');
    const [filedFrom, setFiledFrom] = useState('');
    const [filedTo, setFiledTo] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(0);
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');



    const formatDate = (d) => {
        if (!d) return 'N/A';
        const parsed = new Date(d);
        return isNaN(parsed.getTime()) ? d : parsed.toLocaleDateString();
    };

    const buildParams = (page) => {
        const params = { scope, page, size: pageSize };
        const v = inputValue.trim();
        switch (searchMode) {
            case 'query': if (v) params.query = v; break;
            case 'client': if (v) params.clientUsername = v; break;
            case 'lawyer': if (v) params.lawyerUsername = v; break;
            case 'judge': if (v) params.judgeUsername = v; break;
            case 'status': if (v) params.status = v; break;
            case 'date':
                if (filedFrom) params.filedFrom = filedFrom;
                if (filedTo) params.filedTo = filedTo;
                break;
            default: break;
        }
        return params;
    };

    const doSearch = async (page = 0) => {
        setLoading(true);
        setError('');
        try {
            const res = await searchCases(buildParams(page));
            setResults(res.data);
            setCurrentPage(res.data.page || 0);
        } catch (err) {
            if (err.response?.status !== 403) setError('Search failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const clearFilters = () => {
        setInputValue('');
        setFiledFrom('');
        setFiledTo('');
        setResults(null);
        setError('');
    };

    const handleModeChange = (mode) => {
        setSearchMode(mode);
        setInputValue('');
        setFiledFrom('');
        setFiledTo('');
        // Auto-expand scope to 'all' when admin/judge picks a cross-user filter
        if (showAllScope && crossUserModes.includes(mode)) {
            setScope('all');
        } else if (!crossUserModes.includes(mode)) {
            setScope('my');
        }
    };

    const cases = results?.content || [];
    const totalPages = results?.totalPages || 1;
    const totalElements = results?.totalElements || 0;

    return (
        <motion.div
            className="dash-view active"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <h3>Search Cases</h3>
            <div className="dash-form-card">

                {/* Scope Toggle */}
                {showAllScope && (
                    <div className="filter-actions" style={{ marginBottom: '1.2rem' }}>
                        <div className="scope-toggle">
                            <input type="radio" name="search-scope" id="scope-my" value="my" checked={scope === 'my'} onChange={() => setScope('my')} />
                            <label htmlFor="scope-my">My Cases</label>
                            <input type="radio" name="search-scope" id="scope-all" value="all" checked={scope === 'all'} onChange={() => setScope('all')} />
                            <label htmlFor="scope-all">All Cases</label>
                        </div>
                    </div>
                )}

                {/* Search By Tabs */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem' }}>
                    {SEARCH_MODES.map((mode) => (
                        <button
                            key={mode.value}
                            onClick={() => handleModeChange(mode.value)}
                            className={`filter-tag ${searchMode === mode.value ? 'active' : ''}`}
                        >
                            {mode.label}
                        </button>
                    ))}
                </div>

                {/* Dynamic Input Area */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={searchMode}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        style={{ marginBottom: '1.2rem' }}
                    >
                        {searchMode === 'status' ? (
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Select Status</label>
                                <select
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    style={{ width: '100%', maxWidth: '380px' }}
                                >
                                    <option value="">— Choose a Status —</option>
                                    <option value="FILED">Filed</option>
                                    <option value="SCRUTINY">Scrutiny</option>
                                    <option value="HEARING">Hearing</option>
                                    <option value="ARGUMENT">Argument</option>
                                    <option value="JUDGMENT">Judgment</option>
                                    <option value="CLOSED">Closed</option>
                                </select>
                            </div>
                        ) : searchMode === 'date' ? (
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '160px' }}>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Filed From</label>
                                    <input type="date" value={filedFrom} onChange={(e) => setFiledFrom(e.target.value)} style={{ width: '100%' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: '160px' }}>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Filed To</label>
                                    <input type="date" value={filedTo} onChange={(e) => setFiledTo(e.target.value)} style={{ width: '100%' }} />
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600, color: 'var(--clr-text-secondary)', fontSize: '0.9rem' }}>
                                    {SEARCH_MODES.find(m => m.value === searchMode)?.label}
                                </label>
                                <div className="premium-search-container">
                                    <div className="premium-search-icon">🔍</div>
                                    <input
                                        type="text"
                                        className="premium-search-input"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && doSearch(0)}
                                        placeholder={`Search by ${SEARCH_MODES.find(m => m.value === searchMode)?.label.replace(/^[^\s]+\s/, '')}…`}
                                        autoFocus
                                    />
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Action Buttons */}
                <div className="filter-actions" style={{ marginBottom: '1.5rem' }}>
                    <button
                        className="auth-submit-btn"
                        style={{ width: 'auto', padding: '10px 30px' }}
                        onClick={() => doSearch(0)}
                        disabled={loading}
                    >
                        {loading ? 'Searching…' : 'Search'}
                    </button>
                    <button
                        className="outline-btn"
                        style={{ padding: '10px 20px', fontSize: '0.9rem' }}
                        onClick={clearFilters}
                    >
                        Clear
                    </button>
                </div>

                {/* Results Table */}
                <div className="table-container">
                    <table className="data-table clickable-rows">
                        <thead>
                            <tr>
                                <th>Case Number</th>
                                <th>Title</th>
                                <th>Client</th>
                                <th>Judge</th>
                                <th>Filed Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center' }}>Searching…</td></tr>
                            ) : error ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', color: '#ef4444' }}>{error}</td></tr>
                            ) : cases.length === 0 ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--clr-text-secondary)' }}>
                                    {results ? 'No cases match your criteria.' : 'Choose a filter category above and click Search.'}
                                </td></tr>
                            ) : cases.map((c, i) => (
                                <motion.tr
                                    key={c.caseNumber || i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    onClick={() => navigate(`/dashboard/case/${c.caseNumber}`)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td>{c.caseNumber || 'N/A'}</td>
                                    <td>{c.title || 'Untitled'}</td>
                                    <td>{c.clientUsername || '—'}</td>
                                    <td>{c.judgeUsername || 'Unassigned'}</td>
                                    <td>{formatDate(c.filedDate)}</td>
                                    <td><StatusChip status={c.status} /></td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalElements > 0 && (
                    <div className="pagination-bar" style={{ display: 'flex' }}>
                        <div className="page-info">Page {currentPage + 1} of {totalPages} ({totalElements} total)</div>
                        <div className="page-controls">
                            <select className="page-size-select" value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value)); doSearch(0); }}>
                                <option value="5">5 / page</option>
                                <option value="10">10 / page</option>
                                <option value="20">20 / page</option>
                                <option value="50">50 / page</option>
                            </select>
                            <button disabled={currentPage <= 0} onClick={() => doSearch(0)}>« First</button>
                            <button disabled={currentPage <= 0} onClick={() => doSearch(currentPage - 1)}>← Prev</button>
                            <button disabled={currentPage >= totalPages - 1} onClick={() => doSearch(currentPage + 1)}>Next →</button>
                            <button disabled={currentPage >= totalPages - 1} onClick={() => doSearch(totalPages - 1)}>Last »</button>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
