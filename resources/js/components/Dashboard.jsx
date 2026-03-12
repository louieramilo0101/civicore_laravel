import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';

const API_BASE = '/api';  // Laravel API

function Dashboard() {
    const [stats, setStats] = useState({
        totalDocs: 0,
        processedDocs: 0,
        pendingDocs: 0,
        totalUsers: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [docsRes, usersRes] = await Promise.all([
                    fetch(`${API_BASE}/documents`, { credentials: 'include' }),
                    fetch(`${API_BASE}/users`, { credentials: 'include' })
                ]);
                
                const docs = await docsRes.json();
                const users = await usersRes.json();
                
                setStats({
                    totalDocs: docs.data?.length || 0,
                    processedDocs: docs.data?.filter(d => d.status === 'processed').length || 0,
                    pendingDocs: docs.data?.filter(d => d.status === 'pending').length || 0,
                    totalUsers: users.data?.length || 0
                });
            } catch (err) {
                console.error('Error fetching stats:', err);
            } finally {
                setLoading(false);
            }
        };
        
        fetchStats();
    }, []);

    const user = JSON.parse(sessionStorage.getItem('user') || '{}');

    return (
        <div className="page active" id="dashboardPage">
            {loading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                    <LoadingSpinner size="lg" message="Loading dashboard..." />
                </div>
            ) : (
                <>
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-label">Total Documents</div>
                        <div className="stat-value">{stats.totalDocs}</div>
                        <div className="stat-change">Updated today</div>
                    </div>
                    <div className="stat-card success">
                        <div className="stat-label">Processed</div>
                        <div className="stat-value">{stats.processedDocs}</div>
                        <div className="stat-change">This month</div>
                    </div>
                    <div className="stat-card warning">
                        <div className="stat-label">Pending</div>
                        <div className="stat-value">{stats.pendingDocs}</div>
                        <div className="stat-change">Requires attention</div>
                    </div>
                    <div className="stat-card danger">
                        <div className="stat-label">Users</div>
                        <div className="stat-value">{stats.totalUsers}</div>
                        <div className="stat-change">Active accounts</div>
                    </div>
                </div>

                <div className="charts-container">
                    <div className="chart-card">
                        <h3>Quick Actions</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <Link to="/documents" className="btn-primary" style={{ textAlign: 'center' }}>Upload Document</Link>
                            <Link to="/issuances" className="btn-primary" style={{ textAlign: 'center' }}>Issue Certificate</Link>
                            <Link to="/users" className="btn-primary" style={{ textAlign: 'center' }}>Manage Users</Link>
                        </div>
                    </div>
                    <div className="chart-card">
                        <h3>Welcome, {user.name || 'User'}!</h3>
                        <p style={{ color: 'var(--text-light)' }}>
                            You are logged in as <span className="font-semibold">{user.role || 'User'}</span>.
                        </p>
                    </div>
                </div>
                </>
            )}
        </div>
    );
}

export default Dashboard;

