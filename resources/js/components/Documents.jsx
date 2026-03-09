import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8000';

function Documents() {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedType, setSelectedType] = useState('');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/documents`, { credentials: 'include' });
            const data = await response.json();
            setDocuments(data || []);
        } catch (err) {
            console.error('Error fetching documents:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        if (!file || !selectedType) {
            alert('Please select a document type and file');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('docType', selectedType);
        formData.append('personName', 'Unknown');
        formData.append('barangay', 'Unknown');

        try {
            const response = await fetch(`${API_BASE}/api/documents/upload`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            const data = await response.json();
            alert(data.message || 'Upload successful');
            fetchDocuments();
            setFile(null);
        } catch (err) {
            alert('Upload failed: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="page" id="uploadPage">
            <div className="upload-container">
                <div className="upload-section">
                    <h2>Upload Document</h2>
                    <div className="document-types">
                        <div 
                            className={`doc-type-btn ${selectedType === 'birth' ? 'active' : ''}`}
                            onClick={() => setSelectedType('birth')}
                        >
                            <div className="doc-name">👶 Birth Certificate</div>
                            <div className="doc-desc">Upload and process birth certificates</div>
                        </div>
                        <div 
                            className={`doc-type-btn ${selectedType === 'death' ? 'active' : ''}`}
                            onClick={() => setSelectedType('death')}
                        >
                            <div className="doc-name">⚰️ Death Certificate</div>
                            <div className="doc-desc">Upload and process death certificates</div>
                        </div>
                        <div 
                            className={`doc-type-btn ${selectedType === 'marriage' ? 'active' : ''}`}
                            onClick={() => setSelectedType('marriage')}
                        >
                            <div className="doc-name">💍 Marriage License</div>
                            <div className="doc-desc">Upload and process marriage licenses</div>
                        </div>
                    </div>
                    <div className="upload-area">
                        <input 
                            type="file" 
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileChange}
                            style={{ marginBottom: '15px' }}
                        />
                        {file && <p>Selected: {file.name}</p>}
                    </div>
                    <button 
                        className="btn-primary" 
                        onClick={handleUpload}
                        disabled={uploading}
                        style={{ width: '100%' }}
                    >
                        {uploading ? 'Uploading...' : 'Process with OCR'}
                    </button>
                </div>
                <div className="documents-list">
                    <h3>Recent Documents</h3>
                    {loading ? (
                        <p>Loading...</p>
                    ) : documents.length === 0 ? (
                        <div className="empty-state">
                            <div className="icon">📭</div>
                            <p>No documents uploaded yet</p>
                        </div>
                    ) : (
                        documents.slice(0, 10).map(doc => (
                            <div key={doc.id} className="document-item">
                                <div className="doc-icon">
                                    {doc.docType === 'birth' ? '👶' : doc.docType === 'death' ? '⚰️' : '💍'}
                                </div>
                                <div className="doc-info">
                                    <div className="doc-name">{doc.personName || 'Unknown'}</div>
                                    <div className="doc-meta">{doc.docType} - {doc.status}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

export default Documents;

