import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8000';

function Barangays() {
    const [barangays, setBarangays] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBarangays();
    }, []);

    const fetchBarangays = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/barangays`, { credentials: 'include' });
            const data = await response.json();
            setBarangays(data || []);
        } catch (err) {
            console.error('Error fetching barangays:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page" id="barangaysPage">
            <div style={{ background: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                <h2 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>Barangay Management</h2>
                
                {loading ? (
                    <p>Loading...</p>
                ) : barangays.length === 0 ? (
                    <div className="empty-state">
                        <div className="icon">🏘️</div>
                        <p>No barangays found</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                        {barangays.map(barangay => (
                            <div key={barangay.id} style={{ 
                                padding: '20px', 
                                border: '1px solid #ddd', 
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '40px', marginBottom: '10px' }}>🏘️</div>
                                <h3>{barangay.name}</h3>
                                <p style={{ color: 'var(--text-light)' }}>{barangay.municipality || 'Naic'}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Barangays;

