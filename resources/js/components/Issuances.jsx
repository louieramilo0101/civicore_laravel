import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8000';

function Issuances() {
    const [issuances, setIssuances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchIssuances();
    }, []);

    const fetchIssuances = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/issuances`, { credentials: 'include' });
            const data = await response.json();
            setIssuances(data || []);
        } catch (err) {
            console.error('Error fetching issuances:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredIssuances = filter === 'all' 
        ? issuances 
        : issuances.filter(i => i.certType === filter);

    const getTypeIcon = (type) => {
        switch(type) {
            case 'birth': return '👶';
            case 'death': return '⚰️';
            case 'marriage_license': return '💍';
            default: return '📄';
        }
    };

    const getStatusClass = (status) => {
        switch(status) {
            case 'Issued': return 'status-issued';
            case 'Pending': return 'status-pending';
            default: return '';
        }
    };

    return (
        <div className="page" id="issuancePage">
            <div style={{ background: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
                <h2 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>Certificate Issuance Management</h2>
                
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontWeight: '600', marginBottom: '10px', display: 'block' }}>Filter by Type:</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="btn-primary" onClick={() => setFilter('all')}>All</button>
                        <button className="btn-primary" onClick={() => setFilter('birth')}>👶 Birth</button>
                        <button className="btn-primary" onClick={() => setFilter('death')}>⚰️ Death</button>
                        <button className="btn-primary" onClick={() => setFilter('marriage_license')}>👰 Marriage</button>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--light-bg)', borderBottom: '2px solid #ddd' }}>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Certificate No.</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Type</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Name</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Barangay</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Date</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6">Loading...</td></tr>
                            ) : filteredIssuances.length === 0 ? (
                                <tr><td colSpan="6">No issuances found</td></tr>
                            ) : (
                                filteredIssuances.map(issuance => (
                                    <tr key={issuance.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '12px' }}>{issuance.certNumber}</td>
                                        <td style={{ padding: '12px' }}>{getTypeIcon(issuance.certType)} {issuance.certType}</td>
                                        <td style={{ padding: '12px' }}>{issuance.recipientName}</td>
                                        <td style={{ padding: '12px' }}>{issuance.barangay}</td>
                                        <td style={{ padding: '12px' }}>{issuance.issuanceDate}</td>
                                        <td style={{ padding: '12px' }}>
                                            <span className={getStatusClass(issuance.status)}>{issuance.status}</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Issuances;

