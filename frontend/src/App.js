import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './index.css';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

import AuthPage from './pages/AuthPage';
import StoryLibrary from './pages/StoryLibrary';
import StoryReader from './pages/StoryReader';
import StoryEditor from './pages/StoryEditor';
import MyStories from './pages/MyStories';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <nav className="glass-card" style={{ position: 'fixed', top: '1.5rem', left: '1.5rem', right: '1.5rem', zIndex: 1000, padding: '1rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ fontSize: '1.8rem', fontWeight: 'bold', cursor: 'pointer' }} className="gradient-text" onClick={() => navigate('/')}>StoryForge</div>
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', fontWeight: '500', flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer' }}>Home</button>
        <button onClick={() => navigate('/library')} style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer' }}>Library</button>
        {user ? (
          <>
            <button onClick={() => navigate('/create')} style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer' }}>Create</button>
            <button onClick={() => navigate('/my-stories')} style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer' }}>My Stories</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{user.username}</span>
              <button onClick={logout} className="glass-card" style={{ padding: '0.6rem 1.2rem', background: 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer' }}>Logout</button>
            </div>
          </>
        ) : (
          <button onClick={() => navigate('/auth')} className="glass-card" style={{ padding: '0.7rem 1.5rem', color: 'white', background: 'var(--primary-gradient)', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>Start Your Journey</button>
        )}
      </div>
    </nav>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const { data } = await axios.get('/api/stories');
        setFeatured(data.slice(0, 3));
      } catch (e) { }
    };
    fetchFeatured();
  }, []);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: `url(https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80)`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: -1, filter: 'brightness(0.3)' }} />
      <div className="animate-fade-in" style={{ maxWidth: '800px', padding: '0 2rem' }}>
        <h1 style={{ fontSize: '4.5rem', marginBottom: '1.5rem', fontWeight: 'bold' }}>Craft Your <span className="gradient-text">Legend</span></h1>
        <p style={{ fontSize: '1.4rem', color: 'var(--text-secondary)', marginBottom: '3rem', lineHeight: '1.6' }}>Step into a world where your choices forge the path. Become the author of your own epic destiny.</p>
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {user ? (
            <>
              <button className="glass-card" style={{ padding: '1.2rem 3rem', background: 'var(--primary-gradient)', color: 'white', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }} onClick={() => navigate('/library')}>Explore Library</button>
              <button className="glass-card" style={{ padding: '1.2rem 3rem', fontSize: '1.1rem', cursor: 'pointer' }} onClick={() => navigate('/create')}>Create Story</button>
            </>
          ) : (
            <>
              <button className="glass-card" style={{ padding: '1.2rem 3rem', background: 'var(--primary-gradient)', color: 'white', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }} onClick={() => navigate('/auth')}>Begin Journey</button>
              <button className="glass-card" style={{ padding: '1.2rem 3rem', fontSize: '1.1rem', cursor: 'pointer' }} onClick={() => navigate('/auth')}>Start Writing</button>
            </>
          )}
        </div>
      </div>
      {featured.length > 0 && (
        <div style={{ marginTop: '6rem', width: '100%', maxWidth: '1000px', padding: '0 2rem' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }} className="gradient-text">Featured Adventures</h2>
          <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {featured.map(story => (
              <div key={story._id} className="glass-card animate-fade-in" style={{ width: '300px', cursor: 'pointer', overflow: 'hidden' }} onClick={() => navigate(`/story/${story._id}`)}>
                <div style={{ height: '150px', background: story.coverImage ? `url(${story.coverImage}) center/cover` : 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {!story.coverImage && <span style={{ fontSize: '2rem', fontWeight: 'bold', opacity: 0.5 }}>{story.title[0]}</span>}
                </div>
                <div style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{story.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>By {story.authorName || 'Explorer'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/library" element={<StoryLibrary />} />
          <Route path="/story/:id" element={<StoryReader />} />
          <Route path="/create" element={<StoryEditor />} />
          <Route path="/edit/:id" element={<StoryEditor />} />
          <Route path="/my-stories" element={<MyStories />} />
          <Route path="/auth" element={<AuthPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;