import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "../index.css"; // Import the CSS file
import API from '../api'; // Import your configured API instance

const Login = ({ onLoginSuccess }) => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);
    try {
      console.log('Attempting login with:', form); // Debug login attempt
      const res = await API.post('/auth/login', form); // Use API instance
      const { accessToken, refreshToken, user } = res.data; // Destructure both tokens and user
      console.log('Login successful, tokens received:', { accessToken, refreshToken }); // Debug tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      API.defaults.headers.Authorization = `Bearer ${accessToken}`; // Update API header
      setMessage(`Welcome ${user.name}!`);
      if (onLoginSuccess) {
        onLoginSuccess({ accessToken, refreshToken, user }); // Pass both tokens and user data
      }
      alert('Successfully Login');
      navigate('/dash'); // Navigate to dashboard (adjust path as needed)
    } catch (err) {
      console.error('Login error:', err.response?.data || err.message); // Debug error
      setMessage(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Login</h2>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Your Email"
              value={form.email}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Your Password"
              value={form.password}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>
          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? 'Logging In...' : 'Login'}
          </button>
          {message && <p className={`message ${message.includes('failed') ? 'error' : 'success'}`}>{message}</p>}
        </form>
      </div>
    </div>
  );
};

export default Login;