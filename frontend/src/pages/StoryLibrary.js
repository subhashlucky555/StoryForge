import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../App';

const StoryLibrary = () => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  const categories = ['All', 'Fantasy', 'Adventure', 'Mystery', 'Sci-Fi', 'Horror'];

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const { data } = await api.get('/stories');
        setStories(data);
      } catch (err) { }
      setLoading(false);
    };
    fetchStories();
  }, []);

  useEffect(() => {
    if (user) {
      const fetchFavs = async () => {
        try {
          const { data } = await api.get('/favorites');
          setFavorites(data.map(f => f._id));
        } catch (err) { }
      };
      fetchFavs();
    }
  }, [user]);

  const toggleFavorite = async (e, storyId) => {
    e.stopPropagation();
    if (!user) { navigate('/auth'); return; }
    try {
      const { data } = await api.post(`/favorites/${storyId}`);
      setFavorites(data.map(f => f._id));
    } catch (err) { }
  };

  const filteredStories = stories.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase()) || s.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'All' || s.category === activeCategory;
    const matchesFav = !showFavorites || favorites.includes(s._id);
    return matchesSearch && matchesCategory && matchesFav;
  });

  return (
    <div style={{ paddingTop: '8rem', paddingLeft: '2rem', paddingRight: '2rem', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '2.5rem' }}>Explore <span className="gradient-text">Stories</span></h1>
        <input type="text" placeholder="Search..." className="glass-card" style={{ padding: '1rem 2rem', width: '300px', background: 'rgba(255,255,255,0.05)', color: 'white', maxWidth: '100%' }} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <button key={cat} className="glass-card" style={{ padding: '0.6rem 1.5rem', cursor: 'pointer', background: activeCategory === cat ? 'var(--primary-gradient)' : 'rgba(255,255,255,0.05)', color: 'white', border: 'none', fontWeight: activeCategory === cat ? 'bold' : 'normal' }} onClick={() => setActiveCategory(cat)}>{cat}</button>
        ))}
        {user && (
          <button className="glass-card" style={{ padding: '0.6rem 1.5rem', cursor: 'pointer', background: showFavorites ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(239,68,68,0.5)' }} onClick={() => setShowFavorites(!showFavorites)}>{showFavorites ? '❤️ Showing Favorites' : '🤍 Show Favorites'}</button>
        )}
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', marginTop: '5rem', fontSize: '1.5rem' }}>Loading the magic...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2.5rem' }}>
          {filteredStories.map(story => (
            <div key={story._id} className="glass-card animate-fade-in" style={{ cursor: 'pointer', overflow: 'hidden', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }} onClick={() => navigate(`/story/${story._id}`)} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(131,58,180,0.2)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
              {story.coverImage ? (
                <div style={{ height: '180px', background: `url(${story.coverImage}) center/cover`, position: 'relative' }}>
                  <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', height: '50%', background: 'linear-gradient(transparent, rgba(15,23,42,0.9))' }} />
                </div>
              ) : (
                <div style={{ height: '60px', background: 'var(--primary-gradient)', opacity: 0.3 }} />
              )}
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.2rem', flex: 1 }}>{story.title}</h3>
                  <button onClick={(e) => toggleFavorite(e, story._id)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', padding: '0 0.3rem' }}>{favorites.includes(story._id) ? '❤️' : '🤍'}</button>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ background: 'var(--accent)', color: 'black', fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '1rem', fontWeight: 'bold' }}>{story.category}</span>
                  <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '1rem', background: story.status === 'completed' ? 'rgba(34,197,94,0.2)' : 'rgba(59,130,246,0.2)', color: story.status === 'completed' ? '#22c55e' : '#3b82f6' }}>{story.status}</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{story.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>By {story.authorName || 'Explorer'}</span>
                  <div style={{ color: '#fbbf24', fontSize: '0.85rem' }}>{'★'.repeat(Math.round(story.averageRating))}{'☆'.repeat(5 - Math.round(story.averageRating))}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {filteredStories.length === 0 && !loading && (
        <div style={{ textAlign: 'center', marginTop: '5rem', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: '1.5rem' }}>{showFavorites ? 'No favorites yet.' : 'No stories found.'}</p>
          <button className="glass-card" style={{ marginTop: '2rem', padding: '1rem 2rem', cursor: 'pointer' }} onClick={() => navigate('/create')}>Create New Story</button>
        </div>
      )}
    </div>
  );
};

export default StoryLibrary;