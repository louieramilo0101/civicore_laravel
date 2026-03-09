import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:8000';

function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Store user info in sessionStorage
                sessionStorage.setItem('user', JSON.stringify(data.user));
                // Redirect to dashboard
                navigate('/');
            } else {
                setError(data.message || 'Login failed');
            }
        } catch (err) {
            setError('Connection error. Make sure Laravel server is running on port 8000.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container" style={{ display: 'block' }}>
            <div className="login-box">
                <a href="#" className="back-to-home" onClick={(e) => { e.preventDefault(); navigate('/'); }}>← Back to Home</a>
                <h1>Civil Registry of Naic</h1>
                <p className="subtitle">Document Management System (React)</p>
                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input 
                            type="email" 
                            id="email" 
                            placeholder="Enter your email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input 
                            type="password" 
                            id="password" 
                            placeholder="Enter your password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}
                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
                <div className="demo-users">
                    <strong>Demo Users:</strong><br />
                    Admin: admin@naic-registry.com / password123<br />
                    User: user@naic-registry.com / password123
                </div>
            </div>
        </div>
    );
}

export default Login;

