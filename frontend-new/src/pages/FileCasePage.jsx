import React, { useMemo, useRef, useState } from 'react'
import { fileCase, uploadCaseDocument } from '../services/api'

const initialForm = {
    title: '',
    filingDate: '',
    caseTypeCode: '',
    courtName: '',
    stateCode: '',
    districtCode: '',
    establishmentCode: '',
    filingNumber: '',
    caseYear: String(new Date().getFullYear()),
    petitionerName: localStorage.getItem('username') || 'Rajesh Kumar Sharma',
    respondentName: '',
    behalfOf: 'Self (Individual Filing)',
    description: '',
    legalRepresentation: '',
    clientUsername: '',
}

const stepLabels = ['Case Info', 'Parties', 'Details', 'Documents']

export default function FileCasePage({ onNavigate }) {
    const [step, setStep] = useState(0)
    const [form, setForm] = useState(initialForm)
    const [files, setFiles] = useState([
        { id: 'sample-pdf', name: 'Primary_Case_Petition.pdf', size: 12.4, progress: 100, type: 'pdf', file: null },
        { id: 'sample-id', name: 'Identity_Verification_Aadhar.jpg', size: 2.1, progress: 62, type: 'image', file: null },
    ])
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [successCase, setSuccessCase] = useState(null)
    const inputRef = useRef(null)

    const generatedFilingNumber = useMemo(() => {
        return form.filingNumber || String(Math.floor(1000 + Math.random() * 8000))
    }, [form.filingNumber])

    const updateField = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }))
    }

    const addFiles = (fileList) => {
        const nextFiles = Array.from(fileList).map((file) => ({
            id: `${file.name}-${file.lastModified}`,
            name: file.name,
            size: Number((file.size / 1024 / 1024).toFixed(1)),
            progress: 100,
            type: file.type.includes('pdf') ? 'pdf' : 'file',
            file,
        }))
        setFiles((current) => [...current, ...nextFiles])
    }

    const removeFile = (id) => {
        setFiles((current) => current.filter((file) => file.id !== id))
    }

    const saveDraft = () => {
        localStorage.setItem('ecourtFileCaseDraft', JSON.stringify({ form, files: files.map(({ file, ...rest }) => rest) }))
        setMessage('Draft saved locally in this browser.')
        setError('')
    }

    const submitCase = async () => {
        setSubmitting(true)
        setError('')
        setMessage('')

        try {
            const payload = {
                title: form.title,
                description: form.description,
                courtName: form.courtName,
                stateCode: form.stateCode || '00',
                districtCode: form.districtCode || '00',
                establishmentCode: form.establishmentCode || '00',
                caseTypeCode: form.caseTypeCode || '000',
                filingNumber: generatedFilingNumber,
                caseYear: form.caseYear,
            }

            if (form.clientUsername.trim()) {
                payload.clientUsername = form.clientUsername.trim()
            }

            const caseData = await fileCase(payload)
            const uploadedFiles = files.filter((item) => item.file)
            for (const queuedFile of uploadedFiles) {
                await uploadCaseDocument(caseData.caseNumber, queuedFile.file)
            }

            setSuccessCase({
                number: caseData.caseNumber || `CIVIL/${form.caseYear}/${generatedFilingNumber}`,
                status: caseData.status || 'PROCESSING',
                timestamp: new Date().toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                }),
            })
        } catch (err) {
            setError(err.message || 'Unable to submit case. Sign in and try again.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="filing-app">
            <FilingTopbar onNavigate={onNavigate} />
            <div className="filing-layout">
                <FilingSidebar />
                <main className="filing-main">
                    <header className="filing-title">
                        <h1>File New Case</h1>
                        <p>Complete the judicial filing process by providing accurate case details.</p>
                    </header>

                    <FilingStepper step={step} />

                    {step === 0 && <CaseInfoStep form={form} updateField={updateField} onNext={() => setStep(1)} onSave={saveDraft} />}
                    {step === 1 && <PartiesStep form={form} updateField={updateField} onPrev={() => setStep(0)} onNext={() => setStep(2)} onSave={saveDraft} />}
                    {step === 2 && <DetailsStep form={form} updateField={updateField} onPrev={() => setStep(1)} onNext={() => setStep(3)} onSave={saveDraft} />}
                    {step === 3 && (
                        <DocumentsStep
                            files={files}
                            inputRef={inputRef}
                            submitting={submitting}
                            onAddFiles={addFiles}
                            onRemoveFile={removeFile}
                            onPrev={() => setStep(2)}
                            onSave={saveDraft}
                            onSubmit={submitCase}
                        />
                    )}

                    {(message || error) && (
                        <p className={error ? 'filing-alert error' : 'filing-alert success'}>{error || message}</p>
                    )}
                </main>
            </div>

            {successCase && (
                <SuccessModal
                    caseData={successCase}
                    onFileAnother={() => {
                        setSuccessCase(null)
                        setForm(initialForm)
                        setStep(0)
                    }}
                />
            )}
        </div>
    )
}

function FilingTopbar({ onNavigate }) {
    return (
        <header className="filing-topbar">
            <button type="button" onClick={() => onNavigate('home')} className="filing-brand">JusticePortal</button>
            <nav>
                <button type="button">Dashboard</button>
                <button type="button" className="active">New Filing</button>
                <button type="button">My Cases</button>
            </nav>
            <div className="filing-icons">
                <button type="button">हिन्दी</button>
                <button type="button" aria-label="Notifications">♧</button>
                <button type="button" aria-label="Profile">◎</button>
            </div>
        </header>
    )
}

function FilingSidebar() {
    const items = ['Dashboard', 'New Filing', 'My Cases', 'Calendar', 'Support']
    return (
        <aside className="filing-sidebar">
            <div className="side-heading">
                <strong>Case Management</strong>
                <span>Registry Office</span>
            </div>
            <nav>
                {items.map((item) => (
                    <button key={item} className={item === 'New Filing' ? 'active' : ''} type="button">
                        <span>{item === 'New Filing' ? '⌁' : item === 'My Cases' ? '□' : item === 'Support' ? '?' : '▦'}</span>
                        {item}
                    </button>
                ))}
            </nav>
            <button className="start-filing" type="button">Start New Filing</button>
        </aside>
    )
}

function FilingStepper({ step }) {
    return (
        <div className="filing-stepper">
            {stepLabels.map((label, index) => (
                <React.Fragment key={label}>
                    <div className={index < step ? 'filing-step complete' : index === step ? 'filing-step active' : 'filing-step'}>
                        <span>{index < step ? '✓' : index + 1}</span>
                        <strong>{label}</strong>
                    </div>
                    {index < stepLabels.length - 1 && <div className={index < step ? 'filing-line complete' : 'filing-line'} />}
                </React.Fragment>
            ))}
        </div>
    )
}

function CaseInfoStep({ form, updateField, onNext, onSave }) {
    return (
        <>
            <section className="filing-card">
                <div className="filing-card-head">
                    <h2>Start New Filing</h2>
                    <p>Please provide the initial details to register your case in the digital registry.</p>
                </div>
                <div className="filing-card-body">
                    <div className="filing-grid basic">
                        <FilingField label="Case Title" value={form.title} onChange={(value) => updateField('title', value)} placeholder="e.g., State vs. John Doe (Property Dispute)" hint="Formal name as it will appear on court records" required />
                        <FilingField label="Date of Filing" type="date" value={form.filingDate} onChange={(value) => updateField('filingDate', value)} />
                        <FilingSelect label="Case Type" value={form.caseTypeCode} onChange={(value) => updateField('caseTypeCode', value)} options={[['', 'Select Category'], ['101', 'Civil'], ['102', 'Criminal'], ['103', 'Property'], ['104', 'Family']]} />
                        <FilingField label="Court Name" value={form.courtName} onChange={(value) => updateField('courtName', value)} placeholder="Type to search court jurisdiction..." />
                    </div>
                    <div className="filing-tip-grid">
                        <Tip tone="blue" title="E-Filing Tip" text="Ensure the Case Title matches the primary petitioner and respondent names exactly." />
                        <Tip tone="amber" title="Jurisdiction" text="Selection of court defines the applicable procedural rules for this filing." />
                        <Tip tone="gray" title="Privacy" text="All draft information is encrypted and stored securely until final submission." />
                    </div>
                    <div className="filing-actions">
                        <button type="button" className="outline-action" onClick={onSave}>Save Draft</button>
                        <button type="button" className="text-action">Cancel</button>
                        <button type="button" className="primary-action" onClick={onNext}>Next: Parties →</button>
                    </div>
                </div>
            </section>
            <GuidanceBand />
        </>
    )
}

function PartiesStep({ form, updateField, onPrev, onNext, onSave }) {
    return (
        <section className="filing-card">
            <div className="filing-card-head compact">
                <h2>Parties Involved</h2>
            </div>
            <div className="filing-card-body">
                <div className="filing-grid two">
                    <FilingField label="Petitioner Name" value={form.petitionerName} onChange={(value) => updateField('petitionerName', value)} hint="Pre-filled from profile" />
                    <FilingField label="Respondent Name" value={form.respondentName} onChange={(value) => updateField('respondentName', value)} placeholder="Enter full name of respondent" required />
                </div>
                <FilingSelect label="On behalf of" value={form.behalfOf} onChange={(value) => updateField('behalfOf', value)} options={[['Self (Individual Filing)', 'Self (Individual Filing)'], ['Organization', 'Organization'], ['Client', 'Client']]} />
                <div className="backend-draft-note">Party details are draft-only in the current backend. The case API does not yet store petitioner, respondent, or behalf-of fields.</div>
                <div className="filing-actions blue">
                    <button type="button" className="text-action previous" onClick={onPrev}>← Previous</button>
                    <button type="button" className="text-action" onClick={onSave}>Save Draft</button>
                    <button type="button" className="amber-action" onClick={onNext}>Next Step →</button>
                </div>
            </div>
        </section>
    )
}

function DetailsStep({ form, updateField, onPrev, onNext, onSave }) {
    return (
        <section className="filing-card">
            <div className="filing-card-head compact">
                <h2>Case Description</h2>
            </div>
            <div className="filing-card-body">
                <label className="editor-field">
                    <span>Full Case Narrative *</span>
                    <div className="editor-toolbar">B&nbsp;&nbsp; I&nbsp;&nbsp; ≡&nbsp;&nbsp; 🔗</div>
                    <textarea value={form.description} onChange={(event) => updateField('description', event.target.value)} placeholder="Describe the facts, legal grounds, and relief sought..." required />
                </label>
                <FilingSelect label="Assign Legal Representation" value={form.legalRepresentation} onChange={(value) => updateField('legalRepresentation', value)} options={[['', 'Select a registered lawyer or firm'], ['lawyerdemo', 'lawyerdemo'], ['firm', 'Registered Firm']]} badge="Optional" />
                <FilingField label="Client Username" value={form.clientUsername} onChange={(value) => updateField('clientUsername', value)} placeholder="Required when filing as admin or lawyer, e.g. clientdemo" />
                <div className="filing-grid cnr">
                    <FilingField label="State Code" value={form.stateCode} onChange={(value) => updateField('stateCode', value)} placeholder="00" maxLength="2" />
                    <FilingField label="District Code" value={form.districtCode} onChange={(value) => updateField('districtCode', value)} placeholder="00" maxLength="2" />
                    <FilingField label="Est. Code" value={form.establishmentCode} onChange={(value) => updateField('establishmentCode', value)} placeholder="00" maxLength="2" />
                    <FilingField label="Filing No." value={form.filingNumber} onChange={(value) => updateField('filingNumber', value)} placeholder="8892" maxLength="4" />
                    <FilingField label="Year" value={form.caseYear} onChange={(value) => updateField('caseYear', value)} placeholder="2024" maxLength="4" />
                </div>
                <div className="backend-draft-note">The backend saves title, description, court name, and CNR code fields. Rich text formatting and legal representative selection are not saved yet.</div>
                <div className="filing-actions blue">
                    <button type="button" className="text-action previous" onClick={onPrev}>← Previous</button>
                    <button type="button" className="text-action" onClick={onSave}>Save Draft</button>
                    <button type="button" className="amber-action" onClick={onNext}>Next Step →</button>
                </div>
            </div>
        </section>
    )
}

function DocumentsStep({ files, inputRef, submitting, onAddFiles, onRemoveFile, onPrev, onSave, onSubmit }) {
    return (
        <>
            <section className="documents-layout">
                <div>
                    <div className="documents-title">
                        <h2>Attach Documents</h2>
                        <p>Finalize your filing by uploading necessary legal documentation. Supported formats: PDF, DOCX, JPG (Max 50MB per file).</p>
                    </div>
                    <button
                        type="button"
                        className="drop-zone"
                        onClick={() => inputRef.current?.click()}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                            event.preventDefault()
                            onAddFiles(event.dataTransfer.files)
                        }}
                    >
                        <span>⇧</span>
                        <strong>Drag & Drop files here</strong>
                        <small>or click to browse from your computer</small>
                        <em>PDF only for affidavits</em>
                        <em>OCR recommended</em>
                    </button>
                    <input ref={inputRef} type="file" multiple hidden onChange={(event) => onAddFiles(event.target.files)} />
                    <div className="file-queue">
                        <h3>Queue ({files.length} files)</h3>
                        {files.map((file) => <QueuedFile key={file.id} file={file} onRemove={() => onRemoveFile(file.id)} />)}
                    </div>
                </div>
                <aside className="requirements-card">
                    <h3>Filing Requirements</h3>
                    <ul>
                        <li>All documents must be digitally signed using e-Mudhra or equivalent.</li>
                        <li>Maximum file size for collective upload is 200MB.</li>
                        <li>Scanned copies must be at least 300 DPI for clarity.</li>
                    </ul>
                    <div className="gavel-image" />
                    <p>Justice delayed is justice denied.</p>
                </aside>
            </section>
            <div className="document-actions">
                <button type="button" className="outline-action" onClick={onPrev}>← Back to Details</button>
                <span />
                <button type="button" className="outline-blue">Preview Filing</button>
                <button type="button" className="soft-blue" onClick={onSave}>Save Draft</button>
                <button type="button" className="submit-case" onClick={onSubmit} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Case ▷'}</button>
            </div>
        </>
    )
}

function QueuedFile({ file, onRemove }) {
    return (
        <div className="queued-file">
            <div className={file.type === 'pdf' ? 'file-icon pdf' : 'file-icon'}>{file.type === 'pdf' ? 'PDF' : '▤'}</div>
            <div>
                <strong>{file.name}</strong>
                <span><i style={{ width: `${file.progress}%` }} /></span>
            </div>
            <small>{file.size} MB</small>
            <button type="button" onClick={onRemove}>×</button>
        </div>
    )
}

function FilingField({ label, value, onChange, type = 'text', placeholder = '', hint = '', required = false, maxLength }) {
    return (
        <label className="filing-field">
            <span>{label}{required ? ' *' : ''}</span>
            <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} maxLength={maxLength} />
            {hint && <small>{hint}</small>}
        </label>
    )
}

function FilingSelect({ label, value, onChange, options, badge }) {
    return (
        <label className="filing-field">
            <span>{label} {badge && <em>{badge}</em>}</span>
            <select value={value} onChange={(event) => onChange(event.target.value)}>
                {options.map(([optionValue, labelText]) => <option key={labelText} value={optionValue}>{labelText}</option>)}
            </select>
        </label>
    )
}

function Tip({ tone, title, text }) {
    return (
        <article className={`filing-tip ${tone}`}>
            <strong>{title}</strong>
            <p>{text}</p>
        </article>
    )
}

function GuidanceBand() {
    return (
        <section className="guidance-band">
            <article className="guideline-card">
                <div>
                    <strong>Judicial Guidelines 2024</strong>
                    <span>Updated procedures for electronic filing</span>
                </div>
            </article>
            <article className="registry-help">
                <span>?</span>
                <h3>Need Assistance?</h3>
                <p>Our registry officers are available 24/7 to guide you through the filing process. Start a live chat or call the helpline.</p>
                <button type="button">Contact Registry</button>
            </article>
        </section>
    )
}

function SuccessModal({ caseData, onFileAnother }) {
    return (
        <div className="success-overlay">
            <section className="success-modal">
                <div className="success-icon">✓</div>
                <h2>Case Filed Successfully</h2>
                <p>Your legal filing has been securely submitted to the High Court registry and assigned a tracking number.</p>
                <div className="case-number-box">
                    <span>Generated Case Number</span>
                    <strong>{caseData.number}</strong>
                </div>
                <div className="success-meta">
                    <div><span>Status</span><strong>{caseData.status}</strong></div>
                    <div><span>Timestamp</span><strong>{caseData.timestamp}</strong></div>
                </div>
                <button type="button" className="view-case">View Case Details</button>
                <button type="button" className="file-another" onClick={onFileAnother}>File Another Case ⊕</button>
                <a href="#acknowledgement">Download Submission Acknowledgment (PDF)</a>
                <footer>
                    <span>e-Authenticated via Aadhaar</span>
                    <span>Portal Ref: #JU-992-0X</span>
                </footer>
            </section>
        </div>
    )
}
