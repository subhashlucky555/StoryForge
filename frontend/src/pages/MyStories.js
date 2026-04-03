import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../App';

const MyStories = () => {
    const [stories, setStories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        if (!user) {
            navigate('/auth');
            return;
        }
        const fetchMyStories = async () => {
            try {
                const { data } = await api.get('/stories/mine');
                setStories(data);
            } catch (err) {
                setError('Failed to load stories');
            }
            setLoading(false);
        };
        fetchMyStories();
    }, [user, navigate]);

    const handleDelete = async (storyId) => {
        if (!window.confirm('Are you sure you want to delete this story? This cannot be undone.')) return;
        try {
            await api.delete(`/stories/${storyId}`);
            setStories(stories.filter(s => s._id !== storyId));
        } catch (err) {
            setError('Failed to delete story');
        }
    };

    const handleStatusChange = async (storyId, newStatus) => {
        try {
            const { data } = await api.put(`/stories/${storyId}`, { status: newStatus });
            setStories(stories.map(s => s._id === storyId ? data : s));
        } catch (err) {
            setError('Failed to update status');
        }
    };

    const getStatusColor = (status) => {
        if (status === 'published') return '#3b82f6';
        if (status === 'completed') return '#22c55e';
        return '#eab308';
    };

    if (loading) return <div style={{ paddingTop: '10rem', textAlign: 'center' }}>Loading your stories...</div>;
    if (!user) return null;

    return (
        <div style={{ paddingTop: '8rem', paddingLeft: '2rem', paddingRight: '2rem', minHeight: '100vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h1 style={{ fontSize: '2.5rem' }}>My <span className="gradient-text">Stories</span></h1>
                <button className="glass-card" style={{ padding: '1rem 2rem', background: 'var(--primary-gradient)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => navigate('/create')}>+ Create New Story</button>
            </div>

            {error && <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>}

            {stories.length === 0 ? (
                <div style={{ textAlign: 'center', marginTop: '5rem', color: 'var(--text-secondary)' }}>
                    <p style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>You haven't written any stories yet.</p>
                    <button className="glass-card" style={{ padding: '1rem 2rem', cursor: 'pointer' }} onClick={() => navigate('/create')}>Start Writing</button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
                    {stories.map(story => (
                        <div key={story._id} className="glass-card animate-fade-in" style={{ overflow: 'hidden' }}>
                            {story.coverImage && (
                                <div style={{ height: '150px', background: `url(${story.coverImage}) center/cover` }} />
                            )}
                            <div style={{ padding: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.3rem', marginBottom: '0.8rem' }}>{story.title}</h3>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                    <span style={{ background: 'var(--accent)', color: 'black', fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '1rem', fontWeight: 'bold' }}>{story.category}</span>
                                    <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '1rem', background: `${getStatusColor(story.status)}22`, color: getStatusColor(story.status) }}>{story.status}</span>
                                    <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>{story.scenes.length} scenes</span>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {story.description || 'No description provided.'}
                                </p>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <button className="glass-card" style={{ padding: '0.6rem 1rem', background: 'var(--primary-gradient)', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }} onClick={() => navigate(`/edit/${story._id}`)}>Edit</button>
                                    {story.status === 'draft' && (
                                        <button className="glass-card" style={{ padding: '0.6rem 1rem', color: '#3b82f6', cursor: 'pointer', fontSize: '0.85rem', border: '1px solid #3b82f6' }} onClick={() => handleStatusChange(story._id, 'published')}>Publish</button>
                                    )}
                                    {story.status === 'published' && (
                                        <button className="glass-card" style={{ padding: '0.6rem 1rem', color: '#eab308', cursor: 'pointer', fontSize: '0.85rem', border: '1px solid #eab308' }} onClick={() => handleStatusChange(story._id, 'draft')}>Unpublish</button>
                                    )}
                                    {story.status !== 'completed' && story.status !== 'draft' && (
                                        <button className="glass-card" style={{ padding: '0.6rem 1rem', color: '#22c55e', cursor: 'pointer', fontSize: '0.85rem', border: '1px solid #22c55e' }} onClick={() => handleStatusChange(story._id, 'completed')}>Mark Complete</button>
                                    )}
                                    <button className="glass-card" style={{ padding: '0.6rem 1rem', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.85rem', border: '1px solid var(--accent)' }} onClick={() => navigate(`/story/${story._id}`)}>View</button>
                                    <button style={{ padding: '0.6rem 1rem', background: 'rgba(239,68,68,0.2)', border: 'none', color: '#ef4444', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }} onClick={() => handleDelete(story._id)}>Delete</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyStories;