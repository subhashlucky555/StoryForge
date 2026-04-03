import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../App';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const { data } = await api.post(endpoint, formData);
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', paddingTop: '5rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: `url(https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1920&q=80)`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: -1, filter: 'brightness(0.2)' }} />
      <div className="glass-card animate-fade-in" style={{ padding: '3rem', width: '100%', maxWidth: '450px', backdropFilter: 'blur(20px)', background: 'rgba(15, 23, 42, 0.7)' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '2rem', textAlign: 'center' }} className="gradient-text">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        {error && <p style={{ color: '#ef4444', marginBottom: '1rem', textAlign: 'center' }}>{error}</p>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {!isLogin && (
            <input type="text" placeholder="Username" className="glass-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', color: 'white' }} value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required />
          )}
          <input type="email" placeholder="Email" className="glass-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', color: 'white' }} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
          <input type="password" placeholder="Password" className="glass-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', color: 'white' }} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
          <button type="submit" className="glass-card" style={{ padding: '1rem', background: 'var(--primary-gradient)', color: 'white', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }}>{isLogin ? 'Login' : 'Sign Up'}</button>
        </form>
        <p style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setIsLogin(!isLogin)}>{isLogin ? 'Sign Up' : 'Login'}</span>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;