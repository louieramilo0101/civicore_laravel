import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

const API_BASE = 'http://localhost:8000';

function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/users`, { credentials: 'include' });
            const data = await response.json();
            setUsers(data || []);
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
    const isAdmin = currentUser.role === 'admin';

    return (
        <div className="page" id="accountsPage">
            <div style={{ background: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                <h2 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>User Account Management</h2>
                
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <LoadingSpinner size="md" message="Loading users..." />
                    </div>
                ) : users.length === 0 ? (
                    <p>No users found</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--light-bg)', borderBottom: '2px solid #ddd' }}>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Name</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Email</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Role</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Created At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '12px' }}>{user.name}</td>
                                        <td style={{ padding: '12px' }}>{user.email}</td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{ 
                                                padding: '4px 8px', 
                                                borderRadius: '4px',
                                                background: user.role === 'admin' ? '#9b59b6' : '#3498db',
                                                color: 'white',
                                                fontSize: '12px'
                                            }}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px' }}>{user.created_at}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Users;

