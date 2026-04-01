import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { searchCases } from '../../services/api';
import StatusChip from '../../components/StatusChip';

const SEARCH_MODES = [
    { value: 'query', label: 'Case / Party / Title' },
    { value: 'client', label: 'Client Username' },
    { value: 'lawyer', label: 'Lawyer Username' },
    { value: 'judge', label: 'Judge Username' },
    { value: 'status', label: 'Case Status' },
    { value: 'date', label: 'Filed Date Range' },
];

const SORT_OPTIONS = [
    { value: 'filedDate', label: 'Filed Date' },
    { value: 'updatedAt', label: 'Last Updated' },
    { value: 'caseNumber', label: 'Case Number' },
    { value: 'status', label: 'Status' },
    { value: 'judgeUsername', label: 'Judge' },
];

function formatDate(value) {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}

export default function SearchCases() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const role = user?.role || '';
    const showAllScope = ['ADMIN', 'JUDGE'].includes(role);
    const crossUserModes = ['client', 'lawyer', 'judge'];

    const [scope, setScope] = useState(showAllScope ? 'all' : 'my');
    const [searchMode, setSearchMode] = useState('query');
    const [inputValue, setInputValue] = useState('');
    const [filedFrom, setFiledFrom] = useState('');
    const [filedTo, setFiledTo] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(0);
    const [sortBy, setSortBy] = useState('updatedAt');
    const [direction, setDirection] = useState('desc');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const buildParams = (page) => {
        const params = {
            scope,
            page,
            size: pageSize,
            sortBy,
            direction,
        };
        const value = inputValue.trim();

        switch (searchMode) {
            case 'query':
                if (value) params.query = value;
                break;
            case 'client':
                if (value) params.clientUsername = value;
                break;
            case 'lawyer':
                if (value) params.lawyerUsername = value;
                break;
            case 'judge':
                if (value) params.judgeUsername = value;
                break;
            case 'status':
                if (value) params.status = value;
                break;
            case 'date':
                if (filedFrom) params.filedFrom = filedFrom;
                if (filedTo) params.filedTo = filedTo;
                break;
            default:
                break;
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
            setError(err.response?.data?.message || 'Search failed. Please try again.');
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
        setCurrentPage(0);
    };

    const handleModeChange = (mode) => {
        setSearchMode(mode);
        setInputValue('');
        setFiledFrom('');
        setFiledTo('');

        if (showAllScope && crossUserModes.includes(mode)) {
            setScope('all');
        } else if (!showAllScope) {
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
            transition={{ duration: 0.35 }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div>
                    <h3>Search, Filter, and Sort Cases</h3>
                    <p style={{ color: 'var(--text-gray)', marginTop: '0.4rem' }}>
                        Search by case number, party, status, filing range, and assigned judge.
                    </p>
                </div>
            </div>

            <div className="dash-form-card">
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

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.2rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Sort By</label>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ width: '100%' }}>
                            {SORT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Direction</label>
                        <select value={direction} onChange={(e) => setDirection(e.target.value)} style={{ width: '100%' }}>
                            <option value="desc">Descending</option>
                            <option value="asc">Ascending</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Page Size</label>
                        <select value={pageSize} onChange={(e) => setPageSize(Number.parseInt(e.target.value, 10))} style={{ width: '100%' }}>
                            <option value="5">5 / page</option>
                            <option value="10">10 / page</option>
                            <option value="20">20 / page</option>
                            <option value="50">50 / page</option>
                        </select>
                    </div>
                </div>

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
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Select Status</label>
                                <select value={inputValue} onChange={(e) => setInputValue(e.target.value)} style={{ width: '100%', maxWidth: '380px' }}>
                                    <option value="">Choose a status</option>
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
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Filed From</label>
                                    <input type="date" value={filedFrom} onChange={(e) => setFiledFrom(e.target.value)} style={{ width: '100%' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: '160px' }}>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Filed To</label>
                                    <input type="date" value={filedTo} onChange={(e) => setFiledTo(e.target.value)} style={{ width: '100%' }} />
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600, color: 'var(--clr-text-secondary)', fontSize: '0.9rem' }}>
                                    {SEARCH_MODES.find((mode) => mode.value === searchMode)?.label}
                                </label>
                                <div className="premium-search-container">
                                    <div className="premium-search-icon">🔍</div>
                                    <input
                                        type="text"
                                        className="premium-search-input"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && doSearch(0)}
                                        placeholder={`Search by ${SEARCH_MODES.find((mode) => mode.value === searchMode)?.label.toLowerCase()}...`}
                                        autoFocus
                                    />
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                <div className="filter-actions" style={{ marginBottom: '1.5rem' }}>
                    <button
                        className="auth-submit-btn"
                        style={{ width: 'auto', padding: '10px 30px' }}
                        onClick={() => doSearch(0)}
                        disabled={loading}
                    >
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                    <button className="outline-btn" style={{ padding: '10px 20px', fontSize: '0.9rem' }} onClick={clearFilters}>
                        Clear
                    </button>
                </div>

                <div className="table-container">
                    <table className="data-table clickable-rows">
                        <thead>
                            <tr>
                                <th>Case Number</th>
                                <th>Title</th>
                                <th>Client</th>
                                <th>Lawyer</th>
                                <th>Judge</th>
                                <th>Filed Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center' }}>Searching...</td></tr>
                            ) : error ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', color: '#ef4444' }}>{error}</td></tr>
                            ) : cases.length === 0 ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center' }}>{results ? 'No cases match your criteria.' : 'Choose filters and run a search.'}</td></tr>
                            ) : (
                                cases.map((courtCase, index) => (
                                    <motion.tr
                                        key={courtCase.caseNumber || index}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        onClick={() => navigate(`/dashboard/case/${courtCase.caseNumber}`)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td>{courtCase.caseNumber || 'N/A'}</td>
                                        <td>{courtCase.title || 'Untitled'}</td>
                                        <td>{courtCase.clientUsername || '—'}</td>
                                        <td>{courtCase.lawyerUsername || '—'}</td>
                                        <td>{courtCase.judgeUsername || 'Unassigned'}</td>
                                        <td>{formatDate(courtCase.filedDate)}</td>
                                        <td><StatusChip status={courtCase.status} /></td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalElements > 0 && (
                    <div className="pagination-bar" style={{ display: 'flex' }}>
                        <div className="page-info">Page {currentPage + 1} of {totalPages} ({totalElements} total)</div>
                        <div className="page-controls">
                            <button disabled={currentPage <= 0 || loading} onClick={() => doSearch(0)}>First</button>
                            <button disabled={currentPage <= 0 || loading} onClick={() => doSearch(currentPage - 1)}>Prev</button>
                            <button disabled={currentPage >= totalPages - 1 || loading} onClick={() => doSearch(currentPage + 1)}>Next</button>
                            <button disabled={currentPage >= totalPages - 1 || loading} onClick={() => doSearch(totalPages - 1)}>Last</button>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
