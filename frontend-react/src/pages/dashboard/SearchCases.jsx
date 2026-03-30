import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { searchCases } from '../../services/api';
import StatusChip from '../../components/StatusChip';

export default function SearchCases() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const role = user?.role || '';

    const [scope, setScope] = useState('my');
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('');
    const [client, setClient] = useState('');
    const [judge, setJudge] = useState('');
    const [lawyer, setLawyer] = useState('');
    const [filedDate, setFiledDate] = useState('');
    const [filedFrom, setFiledFrom] = useState('');
    const [filedTo, setFiledTo] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(0);

    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const showAllScope = ['ADMIN', 'JUDGE'].includes(role);

    const formatDate = (d) => {
        if (!d) return 'N/A';
        const parsed = new Date(d);
        return isNaN(parsed.getTime()) ? d : parsed.toLocaleDateString();
    };

    const doSearch = async (page = 0) => {
        setLoading(true);
        setError('');
        try {
            const params = { scope, page, size: pageSize };
            if (query) params.query = query;
            if (status) params.status = status;
            if (client) params.clientUsername = client;
            if (judge) params.judgeUsername = judge;
            if (lawyer) params.lawyerUsername = lawyer;
            if (filedDate) params.filedDate = filedDate;
            if (filedFrom) params.filedFrom = filedFrom;
            if (filedTo) params.filedTo = filedTo;

            const res = await searchCases(params);
            setResults(res.data);
            setCurrentPage(res.data.page || 0);
        } catch (err) {
            if (err.response?.status !== 403) {
                setError('Search failed.');
            }
        } finally {
            setLoading(false);
        }
    };

    const clearFilters = () => {
        setQuery(''); setStatus(''); setClient(''); setJudge('');
        setLawyer(''); setFiledDate(''); setFiledFrom(''); setFiledTo('');
        setScope('my'); setResults(null);
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
                <div className="filter-actions">
                    <div className="scope-toggle">
                        <input type="radio" name="search-scope" id="scope-my" value="my" checked={scope === 'my'} onChange={() => setScope('my')} />
                        <label htmlFor="scope-my">My Cases</label>
                        {showAllScope && (
                            <>
                                <input type="radio" name="search-scope" id="scope-all" value="all" checked={scope === 'all'} onChange={() => setScope('all')} />
                                <label htmlFor="scope-all">All Cases</label>
                            </>
                        )}
                    </div>
                </div>

                {/* Filter Grid */}
                <div className="filter-grid">
                    <div>
                        <label>Search (number / title)</label>
                        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. CASE-2025-0001" />
                    </div>
                    <div>
                        <label>Status</label>
                        <select value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="">All Statuses</option>
                            <option value="FILED">Filed</option>
                            <option value="SCRUTINY">Scrutiny</option>
                            <option value="HEARING">Hearing</option>
                            <option value="ARGUMENT">Argument</option>
                            <option value="JUDGMENT">Judgment</option>
                            <option value="CLOSED">Closed</option>
                        </select>
                    </div>
                    <div>
                        <label>Client Username</label>
                        <input type="text" value={client} onChange={(e) => setClient(e.target.value)} placeholder="Client username" />
                    </div>
                    <div>
                        <label>Judge Username</label>
                        <input type="text" value={judge} onChange={(e) => setJudge(e.target.value)} placeholder="Judge username" />
                    </div>
                    <div>
                        <label>Lawyer Username</label>
                        <input type="text" value={lawyer} onChange={(e) => setLawyer(e.target.value)} placeholder="Lawyer username" />
                    </div>
                    <div>
                        <label>Exact Filed Date</label>
                        <input type="date" value={filedDate} onChange={(e) => setFiledDate(e.target.value)} />
                    </div>
                    <div>
                        <label>Filed From</label>
                        <input type="date" value={filedFrom} onChange={(e) => setFiledFrom(e.target.value)} />
                    </div>
                    <div>
                        <label>Filed To</label>
                        <input type="date" value={filedTo} onChange={(e) => setFiledTo(e.target.value)} />
                    </div>
                </div>

                <div className="filter-actions">
                    <button className="auth-submit-btn" style={{ width: 'auto', padding: '10px 30px' }} onClick={() => doSearch(0)}>
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                    <button className="outline-btn" style={{ padding: '10px 20px', fontSize: '0.9rem' }} onClick={clearFilters}>
                        Clear Filters
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
                                <tr><td colSpan="6" style={{ textAlign: 'center' }}>Searching...</td></tr>
                            ) : error ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', color: '#ef4444' }}>{error}</td></tr>
                            ) : cases.length === 0 ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center' }}>{results ? 'No cases match your criteria.' : 'Use the filters above to search cases.'}</td></tr>
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
                            <button disabled={currentPage <= 0} onClick={() => doSearch(currentPage - 1)}>← Prev</button>
                            <button disabled={currentPage >= totalPages - 1} onClick={() => doSearch(currentPage + 1)}>Next →</button>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
