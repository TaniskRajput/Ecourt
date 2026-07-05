import React, { useEffect, useState } from 'react'
import { getMyProfile, updateMyProfile, changeMyPassword } from '../services/api'
import DashboardLayout from '../components/DashboardLayout'

export default function ProfilePage({ onNavigate }) {
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')

    // Editable fields
    const [editing, setEditing] = useState(false)
    const [form, setForm] = useState({
        fullName: '',
        mobileNumber: '',
        address: '',
        aadhaarLast4: '',
        state: '',
        district: '',
        preferredCourt: '',
        barCouncilId: '',
        enrollmentNumber: '',
        practiceArea: '',
        idProofType: '',
    })

    // Password change
    const [showPassword, setShowPassword] = useState(false)
    const [oldPassword, setOldPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [pwMessage, setPwMessage] = useState('')
    const [pwError, setPwError] = useState('')

    useEffect(() => {
        async function load() {
            try {
                const data = await getMyProfile()
                setProfile(data)
                setForm({
                    fullName: data.fullName || '',
                    mobileNumber: data.mobileNumber || '',
                    address: data.address || '',
                    aadhaarLast4: data.aadhaarLast4 || '',
                    state: data.state || '',
                    district: data.district || '',
                    preferredCourt: data.preferredCourt || '',
                    barCouncilId: data.barCouncilId || '',
                    enrollmentNumber: data.enrollmentNumber || '',
                    practiceArea: data.practiceArea || '',
                    idProofType: data.idProofType || '',
                })
            } catch (err) {
                setError(err.message || 'Unable to load profile.')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const updateField = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    const saveProfile = async () => {
        setMessage('')
        setError('')
        try {
            const data = await updateMyProfile(form)
            setProfile(data)
            setEditing(false)
            setMessage('Profile updated successfully.')
        } catch (err) {
            setError(err.message || 'Update failed.')
        }
    }

    const handlePasswordChange = async (e) => {
        e.preventDefault()
        setPwMessage('')
        setPwError('')
        if (newPassword !== confirmPassword) {
            setPwError('New password and confirm password do not match.')
            return
        }
        try {
            await changeMyPassword(oldPassword, newPassword)
            setPwMessage('Password changed successfully.')
            setOldPassword('')
            setNewPassword('')
            setConfirmPassword('')
            setShowPassword(false)
        } catch (err) {
            setPwError(err.message || 'Password change failed.')
        }
    }

    const role = localStorage.getItem('role') || 'CLIENT'
    const displayRole = role === 'JUDGE' ? 'Judge' : role === 'LAWYER' ? 'Lawyer' : role === 'ADMIN' ? 'Admin' : 'Client'

    return (
        <DashboardLayout onNavigate={onNavigate} activeItem="Profile">
            <main className="profile-main">
                <div className="profile-header-bar">
                    <div>
                        <h1>My Profile</h1>
                        <p>Manage your account information and security settings</p>
                    </div>
                </div>

                {loading && <div className="profile-state">Loading profile...</div>}
                {error && !profile && <div className="profile-state error">{error}</div>}

                {profile && (
                    <div className="profile-layout">
                        {/* Identity Card */}
                        <section className="profile-identity-card">
                            <div className="profile-avatar">
                                {(profile.fullName || profile.username || '?').charAt(0).toUpperCase()}
                            </div>
                            <h2>{profile.fullName || profile.username}</h2>
                            <span className="profile-role-badge">{displayRole} Portal</span>
                            <div className="profile-identity-details">
                                <div><span>Username</span><strong>{profile.username}</strong></div>
                                <div><span>Email</span><strong>{profile.email}</strong></div>
                                <div><span>Role</span><strong>{profile.role}</strong></div>
                                {profile.aadhaarLast4 && <div><span>Aadhaar</span><strong>XXXX-XXXX-{profile.aadhaarLast4}</strong></div>}
                                {profile.createdAt && <div><span>Member Since</span><strong>{new Date(profile.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</strong></div>}
                            </div>
                        </section>

                        <div className="profile-right-col">
                            {/* Personal Details */}
                            <section className="profile-detail-card">
                                <div className="profile-card-head">
                                    <h2>Personal Information</h2>
                                    {!editing ? (
                                        <button onClick={() => setEditing(true)}>Edit</button>
                                    ) : (
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button onClick={saveProfile} className="profile-save-btn">Save</button>
                                            <button onClick={() => {
                                                setEditing(false);
                                                setForm({
                                                    fullName: profile.fullName || '',
                                                    mobileNumber: profile.mobileNumber || '',
                                                    address: profile.address || '',
                                                    aadhaarLast4: profile.aadhaarLast4 || '',
                                                    state: profile.state || '',
                                                    district: profile.district || '',
                                                    preferredCourt: profile.preferredCourt || '',
                                                    barCouncilId: profile.barCouncilId || '',
                                                    enrollmentNumber: profile.enrollmentNumber || '',
                                                    practiceArea: profile.practiceArea || '',
                                                    idProofType: profile.idProofType || '',
                                                })
                                            }}>Cancel</button>
                                        </div>
                                    )}
                                </div>

                                {(message || error) && <p className={error ? 'profile-alert error' : 'profile-alert success'}>{error || message}</p>}

                                <div className="profile-fields">
                                    <label>
                                        <span>Full Name</span>
                                        <input
                                            value={form.fullName}
                                            onChange={(e) => updateField('fullName', e.target.value)}
                                            disabled={!editing}
                                            placeholder="Enter your full name"
                                        />
                                    </label>
                                    <label>
                                        <span>Mobile Number</span>
                                        <input
                                            value={form.mobileNumber}
                                            onChange={(e) => updateField('mobileNumber', e.target.value)}
                                            disabled={!editing}
                                            placeholder="+91 98765 43210"
                                        />
                                    </label>
                                    <label className="profile-field-full">
                                        <span>Address</span>
                                        <input
                                            value={form.address}
                                            onChange={(e) => updateField('address', e.target.value)}
                                            disabled={!editing}
                                            placeholder="Residential / chamber address"
                                        />
                                    </label>
                                    <label>
                                        <span>Aadhaar Last 4</span>
                                        <input
                                            value={form.aadhaarLast4}
                                            onChange={(e) => updateField('aadhaarLast4', e.target.value)}
                                            disabled={!editing}
                                            maxLength="4"
                                            placeholder="1234"
                                        />
                                    </label>
                                    <label>
                                        <span>State</span>
                                        <input
                                            value={form.state}
                                            onChange={(e) => updateField('state', e.target.value)}
                                            disabled={!editing}
                                            placeholder="Delhi"
                                        />
                                    </label>
                                    <label>
                                        <span>District</span>
                                        <input
                                            value={form.district}
                                            onChange={(e) => updateField('district', e.target.value)}
                                            disabled={!editing}
                                            placeholder="New Delhi"
                                        />
                                    </label>
                                    <label>
                                        <span>Preferred Court</span>
                                        <input
                                            value={form.preferredCourt}
                                            onChange={(e) => updateField('preferredCourt', e.target.value)}
                                            disabled={!editing}
                                            placeholder="Delhi High Court"
                                        />
                                    </label>
                                    <label>
                                        <span>ID Proof Type</span>
                                        <select
                                            value={form.idProofType}
                                            onChange={(e) => updateField('idProofType', e.target.value)}
                                            disabled={!editing}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)' }}
                                        >
                                            <option value="">Select ID Type</option>
                                            <option value="Aadhaar">Aadhaar</option>
                                            <option value="PAN">PAN</option>
                                            <option value="Passport">Passport</option>
                                            <option value="Voter ID">Voter ID</option>
                                        </select>
                                    </label>
                                    <label>
                                        <span>Practice Area</span>
                                        <input
                                            value={form.practiceArea}
                                            onChange={(e) => updateField('practiceArea', e.target.value)}
                                            disabled={!editing}
                                            placeholder="Civil, Criminal, Tax"
                                        />
                                    </label>
                                    {profile.role === 'LAWYER' && (
                                        <>
                                            <label>
                                                <span>Bar Council ID</span>
                                                <input
                                                    value={form.barCouncilId}
                                                    onChange={(e) => updateField('barCouncilId', e.target.value)}
                                                    disabled={!editing}
                                                    placeholder="D/1234/2024"
                                                />
                                            </label>
                                            <label>
                                                <span>Enrollment Number</span>
                                                <input
                                                    value={form.enrollmentNumber}
                                                    onChange={(e) => updateField('enrollmentNumber', e.target.value)}
                                                    disabled={!editing}
                                                    placeholder="BCI-2024-0091"
                                                />
                                            </label>
                                        </>
                                    )}
                                </div>
                            </section>

                            {/* Security / Password */}
                            <section className="profile-detail-card">
                                <div className="profile-card-head">
                                    <h2>Security Settings</h2>
                                    {!showPassword && <button onClick={() => setShowPassword(true)}>Change Password</button>}
                                </div>

                                {showPassword && (
                                    <form className="profile-password-form" onSubmit={handlePasswordChange}>
                                        {pwError && <p className="profile-alert error">{pwError}</p>}
                                        {pwMessage && <p className="profile-alert success">{pwMessage}</p>}
                                        <label>
                                            <span>Current Password</span>
                                            <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required />
                                        </label>
                                        <label>
                                            <span>New Password</span>
                                            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength="8" />
                                        </label>
                                        <label>
                                            <span>Confirm Password</span>
                                            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                                        </label>
                                        <div className="profile-pw-actions">
                                            <button type="submit" className="profile-save-btn">Update Password</button>
                                            <button type="button" onClick={() => { setShowPassword(false); setPwError(''); setPwMessage('') }}>Cancel</button>
                                        </div>
                                    </form>
                                )}
                            </section>
                        </div>
                    </div>
                )}
            </main>
        </DashboardLayout>
    )
}
