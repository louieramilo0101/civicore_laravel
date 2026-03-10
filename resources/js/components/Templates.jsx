import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

const API_BASE = 'http://localhost:8000';

function Templates() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/templates`, { credentials: 'include' });
            const data = await response.json();
            setTemplates(data || []);
        } catch (err) {
            console.error('Error fetching templates:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page" id="templatesPage">
            <div style={{ background: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                <h2 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>Template Management</h2>
                
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <LoadingSpinner size="md" message="Loading templates..." />
                    </div>
                ) : templates.length === 0 ? (
                    <div className="empty-state">
                        <div className="icon">📝</div>
                        <p>No templates found</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '15px' }}>
                        {templates.map(template => (
                            <div key={template.id} style={{ 
                                padding: '20px', 
                                border: '1px solid #ddd', 
                                borderRadius: '8px'
                            }}>
                                <h3>{template.name || template.type}</h3>
                                <p style={{ color: 'var(--text-light)', marginTop: '10px' }}>
                                    {template.description || 'Template for ' + template.type}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Templates;

