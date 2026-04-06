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
    const [message, setMessage] = useState({ text: '', isError: false });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ text: '', isError: false });
        setLoading(true);

        const payload = { title, description, courtName: courtName.trim() || undefined };
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
