import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { fileCase } from '../../services/api';

export default function FileCase() {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [clientUsername, setClientUsername] = useState('');
    const [courtName, setCourtName] = useState('');

    // CNR fields
    const [stateCode, setStateCode] = useState('');
    const [districtCode, setDistrictCode] = useState('');
    const [establishmentCode, setEstablishmentCode] = useState('');
    const [caseTypeCode, setCaseTypeCode] = useState('');
    const [filingNumber, setFilingNumber] = useState('');
    const [caseYear, setCaseYear] = useState('');

    const [message, setMessage] = useState({ text: '', isError: false });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ text: '', isError: false });
        setLoading(true);

        const payload = {
            title, description, courtName: courtName.trim() || undefined,
            stateCode, districtCode, establishmentCode, caseTypeCode, filingNumber, caseYear
        };
        if (['ADMIN', 'LAWYER'].includes(user.role) && clientUsername.trim()) {
            payload.clientUsername = clientUsername.trim();
        }

        try {
            const res = await fileCase(payload);
            const caseNumber = res.data?.caseNumber;
            setMessage({
                text: caseNumber ? `Case filed successfully: ${caseNumber}` : 'Case filed successfully.',
                isError: false
            });
            setTitle('');
            setDescription('');
            setClientUsername('');
            setCourtName('');
            setStateCode('');
            setDistrictCode('');
            setEstablishmentCode('');
            setCaseTypeCode('');
            setFilingNumber('');
            setCaseYear('');
        } catch (err) {
            setMessage({
                text: err.response?.data?.message || err.response?.data || 'Unable to file case.',
                isError: true
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            className="dash-view active"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <h3>File a New Case</h3>
            <div className="dash-form-card">
                <form onSubmit={handleSubmit}>
                    <div className="input-container">
                        <label>Title</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Property Dispute" />
                    </div>
                    <div className="input-container">
                        <label>Description</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="Case details..." rows="3" />
                    </div>
                    <div className="input-container">
                        <label>Court Name (optional)</label>
                        <input type="text" value={courtName} onChange={(e) => setCourtName(e.target.value)} placeholder="District Court, Patna" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                        <div className="input-container">
                            <label>State Code (2)</label>
                            <input type="text" value={stateCode} onChange={(e) => setStateCode(e.target.value)} maxLength="2" required />
                        </div>
                        <div className="input-container">
                            <label>District Code (2)</label>
                            <input type="text" value={districtCode} onChange={(e) => setDistrictCode(e.target.value)} maxLength="2" required />
                        </div>
                        <div className="input-container">
                            <label>Est. Code (2)</label>
                            <input type="text" value={establishmentCode} onChange={(e) => setEstablishmentCode(e.target.value)} maxLength="2" required />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                        <div className="input-container">
                            <label>Case Type Code (3)</label>
                            <input type="text" value={caseTypeCode} onChange={(e) => setCaseTypeCode(e.target.value)} maxLength="3" required />
                        </div>
                        <div className="input-container">
                            <label>Filing Number (4)</label>
                            <input type="text" value={filingNumber} onChange={(e) => setFilingNumber(e.target.value)} maxLength="4" required />
                        </div>
                        <div className="input-container">
                            <label>Year (4)</label>
                            <input type="text" value={caseYear} onChange={(e) => setCaseYear(e.target.value)} maxLength="4" required />
                        </div>
                    </div>
                    {['ADMIN', 'LAWYER'].includes(user.role) && (
                        <div className="input-container">
                            <label>Client Username (required for admin/lawyer filing)</label>
                            <input type="text" value={clientUsername} onChange={(e) => setClientUsername(e.target.value)} placeholder="Client's exact username" />
                        </div>
                    )}
                    <button type="submit" className="auth-submit-btn dark-btn" disabled={loading}>
                        {loading ? 'Filing...' : 'File Case'}
                    </button>
                    {message.text && (
                        <div className={`message ${message.isError ? 'error-msg' : 'success-msg'}`}>
                            {message.text}
                        </div>
                    )}
                </form>
            </div>
        </motion.div>
    );
}
