import React, { useState } from 'react';
import API from '../api';
import { useNavigate } from 'react-router-dom';

function AdminLogin({ setAdminToken }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    
    // Basic validation (optional)
    if (!email || !password) {
      setMessage('Please fill in both fields.');
      return;
    }

    try {
      const res = await API.post('http://localhost:5000/api/admin/login', { email, password });
  
      if (res && res.data && res.data.token) {
        localStorage.setItem('adminToken', res.data.token);
        setMessage("Logged in successfully!");
        alert("Logged in!");
        navigate('/admin/dash');
      } else {
        setMessage("Login failed: Token not received.");
      }
  
    } catch (err) {
      console.error("Login error:", err);
      setMessage(err?.response?.data?.error || "Login failed");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Admin Login</h2>
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter Email"
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Password"
              className="form-input"
              required
            />
          </div>
          <button type="submit" className="login-button">Login</button>
        </form>
        {message && <p className={`message ${message.includes('failed') ? 'error' : 'success'}`}>{message}</p>}
      </div>
    </div>
  );
}

export default AdminLogin;
