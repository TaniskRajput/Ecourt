import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getMyProfile, updateMyProfile } from '../../services/api';
import { FiUser, FiMail, FiPhone, FiMapPin, FiShield, FiEdit2, FiCreditCard } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

export default function ProfilePage() {
    const { user } = useAuth(); 
    
    const [profile, setProfile] = useState({
        username: user?.username || '',
        email: user?.email || '',
        role: user?.role || '',
        fullName: '',
        mobileNumber: '',
        address: '',
        aadhaarLast4: ''
    });
    
    const [editing, setEditing] = useState({
        username: false,
        email: false,
        role: false,
        fullName: false,
        mobileNumber: false,
        address: false,
        aadhaarLast4: false
    });
    
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const res = await getMyProfile();
            setProfile({
                username: res.data?.username || user?.username || '',
                email: res.data?.email || user?.email || '',
                role: res.data?.role || user?.role || '',
                fullName: res.data?.fullName || '',
                mobileNumber: res.data?.mobileNumber || '',
                address: res.data?.address || '',
                aadhaarLast4: res.data?.aadhaarLast4 || ''
            });
        } catch (err) {
            setError('Could not load all profile data. Showing current session details.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'aadhaarLast4') {
            const onlyNums = value.replace(/[^0-9]/g, '');
            if (onlyNums.length <= 4) {
                setProfile(prev => ({ ...prev, [name]: onlyNums }));
            }
        } else {
            setProfile(prev => ({ ...prev, [name]: value }));
        }
    };

    const toggleEdit = (field) => {
        setEditing(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const isAnyEditing = Object.values(editing).some(v => v);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');
        
        try {
            const payload = {
                fullName: profile.fullName,
                mobileNumber: profile.mobileNumber,
                address: profile.address,
                aadhaarLast4: profile.aadhaarLast4
            };
            await updateMyProfile(profile.username, payload);
            setSuccess('Profile updated successfully!');
            setEditing({ username: false, email: false, role: false, fullName: false, mobileNumber: false, address: false, aadhaarLast4: false });
            if (profile.username !== user?.username) {
                 setSuccess('Profile updated successfully! If you changed your username, you may need to log in again soon.');
            }
            fetchProfile();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading-state">Loading profile...</div>;

    return (
        <motion.div 
            className="dash-view active"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div style={{ marginBottom: '1.5rem' }}>
                <h3>Profile Management</h3>
                <p style={{ color: 'var(--text-gray)', marginTop: '0.4rem' }}>View and update your personal details</p>
            </div>

            <div className="dash-form-card" style={{ position: 'relative' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ marginBottom: '0.35rem' }}>Personal Information</h4>
                    <p style={{ color: 'var(--text-gray)', margin: 0 }}>Keep your contact details up to date</p>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 15px' }}>
                        
                        <div className="input-container" style={{ marginBottom: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                <label style={{ margin: 0 }}><FiUser style={{ marginRight: '5px' }}/> Username</label>
                                {!editing.username && <button type="button" style={{ background: 'none', border: 'none', color: 'var(--button-blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }} onClick={() => toggleEdit('username')}><FiEdit2 /> Edit</button>}
                            </div>
                            {editing.username ? (
                                <input type="text" name="username" value={profile.username} onChange={handleChange} required />
                            ) : (
                                <div style={{ padding: '8px 0', fontWeight: 500 }}>{profile.username || '—'}</div>
                            )}
                        </div>
                        
                        <div className="input-container" style={{ marginBottom: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                <label style={{ margin: 0 }}><FiMail style={{ marginRight: '5px' }}/> Email Address</label>
                                {!editing.email && <button type="button" style={{ background: 'none', border: 'none', color: 'var(--button-blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }} onClick={() => toggleEdit('email')}><FiEdit2 /> Edit</button>}
                            </div>
                            {editing.email ? (
                                <input type="email" value={profile.email} disabled style={{ background: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }} title="Email cannot be changed" />
                            ) : (
                                <div style={{ padding: '8px 0', fontWeight: 500 }}>{profile.email || '—'}</div>
                            )}
                        </div>
                        
                        <div className="input-container" style={{ marginBottom: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                <label style={{ margin: 0 }}><FiShield style={{ marginRight: '5px' }}/> Account Role</label>
                                {!editing.role && <button type="button" style={{ background: 'none', border: 'none', color: 'var(--button-blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }} onClick={() => toggleEdit('role')}><FiEdit2 /> Edit</button>}
                            </div>
                            {editing.role ? (
                                <input type="text" value={profile.role} disabled style={{ background: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }} title="To request a role change, contact support" />
                            ) : (
                                <div style={{ padding: '8px 0', fontWeight: 500 }}>{profile.role || '—'}</div>
                            )}
                        </div>

                        <div className="input-container" style={{ marginBottom: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                <label style={{ margin: 0 }}>Full Name</label>
                                {!editing.fullName && <button type="button" style={{ background: 'none', border: 'none', color: 'var(--button-blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }} onClick={() => toggleEdit('fullName')}><FiEdit2 /> Edit</button>}
                            </div>
                            {editing.fullName ? (
                                <input type="text" name="fullName" value={profile.fullName} onChange={handleChange} placeholder="Enter your full name" />
                            ) : (
                                <div style={{ padding: '8px 0', fontWeight: 500 }}>{profile.fullName || '—'}</div>
                            )}
                        </div>
                        
                        <div className="input-container" style={{ marginBottom: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                <label style={{ margin: 0 }}><FiPhone style={{ marginRight: '5px' }}/> Mobile Number</label>
                                {!editing.mobileNumber && <button type="button" style={{ background: 'none', border: 'none', color: 'var(--button-blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }} onClick={() => toggleEdit('mobileNumber')}><FiEdit2 /> Edit</button>}
                            </div>
                            {editing.mobileNumber ? (
                                <input type="text" name="mobileNumber" value={profile.mobileNumber} onChange={handleChange} placeholder="Enter your mobile number" />
                            ) : (
                                <div style={{ padding: '8px 0', fontWeight: 500 }}>{profile.mobileNumber || '—'}</div>
                            )}
                        </div>

                        <div className="input-container" style={{ marginBottom: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                <label style={{ margin: 0 }}><FiCreditCard style={{ marginRight: '5px' }}/> Aadhaar (Last 4)</label>
                                {!editing.aadhaarLast4 && <button type="button" style={{ background: 'none', border: 'none', color: 'var(--button-blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }} onClick={() => toggleEdit('aadhaarLast4')}><FiEdit2 /> Edit</button>}
                            </div>
                            {editing.aadhaarLast4 ? (
                                <input type="text" name="aadhaarLast4" value={profile.aadhaarLast4} onChange={handleChange} placeholder="e.g. 4321" maxLength="4" />
                            ) : (
                                <div style={{ padding: '8px 0', fontWeight: 500 }}>{profile.aadhaarLast4 ? `XXXX-XXXX-${profile.aadhaarLast4}` : '—'}</div>
                            )}
                        </div>
                        
                        <div className="input-container" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                <label style={{ margin: 0 }}><FiMapPin style={{ marginRight: '5px' }}/> Address</label>
                                {!editing.address && <button type="button" style={{ background: 'none', border: 'none', color: 'var(--button-blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }} onClick={() => toggleEdit('address')}><FiEdit2 /> Edit</button>}
                            </div>
                            {editing.address ? (
                                <textarea name="address" value={profile.address} onChange={handleChange} rows="3" placeholder="Enter your complete address"></textarea>
                            ) : (
                                <div style={{ padding: '8px 0', fontWeight: 500 }}>{profile.address || '—'}</div>
                            )}
                        </div>
                    </div>

                    {error && <div className="error-msg" style={{ marginTop: '20px' }}>{error}</div>}
                    {success && <div className="success-msg" style={{ marginTop: '20px' }}>{success}</div>}

                    {isAnyEditing && (
                        <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
                            <button type="submit" className="auth-submit-btn dark-btn" style={{ width: 'auto', margin: 0 }} disabled={saving}>
                                {saving ? 'Saving Changes...' : 'Save Changes'}
                            </button>
                            <button type="button" className="outline-btn" style={{ width: 'auto', padding: '12px 20px' }} onClick={() => { 
                                setEditing({ username: false, email: false, role: false, fullName: false, mobileNumber: false, address: false, aadhaarLast4: false }); 
                                fetchProfile(); 
                            }}>
                                Cancel All
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </motion.div>
    );
}


