import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../App';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';

const treeStyles = `
  .tree-container { overflow: auto; padding: 40px 20px; position: relative; }
  .tree-list { display: flex; justify-content: center; padding-top: 30px; position: relative; list-style: none; margin: 0; padding-left: 0; }
  .tree-list::before { content: ''; position: absolute; top: 0; left: 50%; border-left: 2px solid rgba(255,255,255,0.15); height: 30px; }
  .tree-node-wrapper { display: flex; flex-direction: column; align-items: center; position: relative; padding: 30px 15px 0; }
  .tree-node-wrapper::before { content: ''; position: absolute; top: 0; width: 100%; border-top: 2px solid rgba(255,255,255,0.15); }
  .tree-node-wrapper::after { content: ''; position: absolute; top: 0; height: 30px; border-left: 2px solid rgba(255,255,255,0.15); }
  .tree-node-wrapper:first-child::before { left: 50%; width: 50%; }
  .tree-node-wrapper:last-child::before { right: 50%; width: 50%; left: 0; }
  .tree-node-wrapper:only-child::before { display: none; }
  .tree-node-wrapper:first-child::after, .tree-node-wrapper:last-child::after, .tree-node-wrapper:only-child::after { left: 50%; }
  .tree-node-content { position: relative; z-index: 1; padding: 10px 20px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; cursor: pointer; white-space: nowrap; transition: all 0.2s; font-size: 0.9rem; text-align: center; }
  .tree-node-content:hover { background: rgba(255,255,255,0.1); transform: scale(1.05); }
  .tree-node-content.active { background: var(--primary-gradient); border-color: var(--accent); box-shadow: 0 0 15px rgba(131, 58, 180, 0.4); }
  .tree-node-content.on-path { border-color: rgba(131, 58, 180, 0.5); background: rgba(131, 58, 180, 0.15); }
  .tree-choice-label { font-size: 0.8rem; color: var(--accent); margin-top: 10px; margin-bottom: 15px; max-width: 150px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; opacity: 0.8; height: 20px; }
  .unreachable-list { margin-top: 40px; padding-top: 20px; border-top: 1px dashed rgba(239, 68, 68, 0.3); }
  .unreachable-node { display: inline-block; margin: 5px; padding: 8px 12px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; color: #ef4444; cursor: pointer; font-size: 0.85rem; }
  .tiptap { outline: none; min-height: 200px; padding: 1rem; color: white; font-size: 1.05rem; line-height: 1.6; }
  .tiptap img { max-width: 100%; border-radius: 8px; margin: 1rem 0; }
  .tiptap p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: rgba(255,255,255,0.3); pointer-events: none; height: 0; }
  .tiptap h1 { font-size: 2em; margin: 0.8rem 0; }
  .tiptap h2 { font-size: 1.5em; margin: 0.7rem 0; }
  .tiptap h3 { font-size: 1.17em; margin: 0.6rem 0; }
  .tiptap strong { font-weight: bold; }
  .tiptap em { font-style: italic; }
  .tiptap p { margin-bottom: 0.75rem; }
  .tiptap ul, .tiptap ol { padding-left: 1.5rem; margin-bottom: 0.75rem; }
  .tiptap li { margin-bottom: 0.25rem; }
  .tiptap blockquote { border-left: 3px solid var(--accent); padding-left: 1rem; margin: 0.75rem 0; color: var(--text-secondary); }
  .editor-toolbar { display: flex; flex-wrap: wrap; gap: 4px; padding: 8px; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 8px 8px 0 0; margin-bottom: -1px; position: relative; z-index: 1; }
  .editor-toolbar button { width: 36px; height: 36px; border: none; background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7); border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; transition: 0.15s; }
  .editor-toolbar button:hover { background: rgba(255,255,255,0.12); color: white; }
  .editor-toolbar button.is-active { background: rgba(131, 58, 180, 0.3); color: var(--accent); }
  .editor-toolbar .separator { width: 1px; height: 24px; background: rgba(255,255,255,0.1); margin: 6px 4px; }
  .editor-toolbar .toolbar-label { display: flex; align-items: center; padding: 0 8px; color: rgba(255,255,255,0.5); font-size: 0.8rem; }
`;

const TreeNode = ({ scene, scenes, activeId, onSelect, visited = new Set(), pathSet }) => {
  if (visited.has(scene.id)) return null;
  const newVisited = new Set(visited);
  newVisited.add(scene.id);
  const isActive = scene.id === activeId;
  const onPath = pathSet && pathSet.has(scene.id);

  return (
    <li className="tree-node-wrapper">
      <div
        className={`tree-node-content ${isActive ? 'active' : ''} ${onPath ? 'on-path' : ''}`}
        onClick={() => onSelect(scene.id)}
      >
        {scene.title}{scene.isEnding ? ' 🏁' : ''}
      </div>
      {scene.choices.length > 0 && (
        <ul className="tree-list">
          {scene.choices.map((choice, i) => {
            const nextScene = scenes.find(s => s.id === choice.nextSceneId);
            if (!nextScene) {
              return (
                <li key={i} className="tree-node-wrapper">
                  <span className="tree-choice-label" title="Target missing">⚠ Missing Target</span>
                </li>
              );
            }
            return (
              <li key={i} className="tree-node-wrapper">
                <span className="tree-choice-label" title={choice.text}>{choice.text || 'Empty Choice'}</span>
                <TreeNode scene={nextScene} scenes={scenes} activeId={activeId} onSelect={onSelect} visited={newVisited} pathSet={pathSet} />
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
};

function isReachable(scenes, startId, targetId) {
  if (startId === targetId) return true;
  const visited = new Set([startId]);
  const queue = [startId];
  while (queue.length > 0) {
    const curr = queue.shift();
    const scene = scenes.find(s => s.id === curr);
    if (!scene) continue;
    for (const choice of scene.choices) {
      if (choice.nextSceneId && !visited.has(choice.nextSceneId)) {
        if (choice.nextSceneId === targetId) return true;
        visited.add(choice.nextSceneId);
        queue.push(choice.nextSceneId);
      }
    }
  }
  return false;
}

const StoryEditor = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [error, setError] = useState('');
  const [showTree, setShowTree] = useState(false);
  const [story, setStory] = useState({
    title: '', description: '', category: 'Fantasy', coverImage: '', status: 'draft',
    initialSceneId: 'start',
    scenes: [{ id: 'start', title: 'Beginning', content: '', choices: [], isEnding: false }]
  });
  const [activeSceneId, setActiveSceneId] = useState('start');
  const [uploading, setUploading] = useState(false);
  const [editorUploading, setEditorUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: 'What happens in this scene...' }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      updateScene(activeSceneId, 'content', editor.getHTML());
    },
  });

  useEffect(() => {
    if (id) {
      const fetchStory = async () => {
        try {
          const { data } = await api.get(`/stories/${id}`);
          setStory(data);
          setActiveSceneId(data.initialSceneId);
        } catch (err) { navigate('/my-stories'); }
      };
      fetchStory();
    }
  }, [id]);

  useEffect(() => {
    if (editor) {
      const scene = story.scenes.find(s => s.id === activeSceneId);
      if (scene) {
        editor.commands.setContent(scene.content || '');
      }
    }
  }, [activeSceneId, editor]);

  const updateScene = (sid, field, value) => {
    setStory(prev => ({ ...prev, scenes: prev.scenes.map(s => s.id === sid ? { ...s, [field]: value } : s) }));
  };

  const addScene = () => {
    const newId = `scene_${Date.now()}`;
    setStory(prev => ({ ...prev, scenes: [...prev.scenes, { id: newId, title: 'New Scene', content: '', choices: [], isEnding: false }] }));
    setActiveSceneId(newId);
    setShowTree(false);
  };

  const deleteScene = (sid) => {
    if (sid === 'start') return;
    const filtered = story.scenes.filter(s => s.id !== sid);
    const newActive = sid === activeSceneId ? filtered[0].id : activeSceneId;
    setStory(prev => ({ ...prev, scenes: filtered }));
    setActiveSceneId(newActive);
  };

  const addChoice = (sid) => {
    setStory(prev => ({ ...prev, scenes: prev.scenes.map(s => s.id === sid ? { ...s, choices: [...s.choices, { text: '', hint: '', nextSceneId: '' }] } : s) }));
  };

  const updateChoice = (sid, ci, field, value) => {
    setStory(prev => ({ ...prev, scenes: prev.scenes.map(s => s.id === sid ? { ...s, choices: s.choices.map((c, i) => i === ci ? { ...c, [field]: value } : c) } : s) }));
  };

  const deleteChoice = (sid, ci) => {
    const scene = story.scenes.find(s => s.id === sid);
    if (scene) updateScene(sid, 'choices', scene.choices.filter((_, i) => i !== ci));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await api.post('/upload', formData);
      setStory(prev => ({ ...prev, coverImage: data.path }));
    } catch (err) { setError('Failed to upload image'); }
    setUploading(false);
  };

  const handleEditorImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !editor) return;
    setEditorUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await api.post('/upload', formData);
      editor.chain().focus().setImage({ src: data.path }).run();
    } catch (err) { setError('Failed to upload image'); }
    setEditorUploading(false);
    e.target.value = '';
  };

  const handleImageUrlInsert = () => {
    const url = window.prompt('Enter image URL:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const validateAndSave = async (targetStatus) => {
    const titles = story.scenes.map(s => s.title.trim()).filter(t => t);
    if (new Set(titles).size !== titles.length) { setError('Duplicate scene names are not allowed'); return; }
    if (!story.title.trim()) { setError('Story title is required'); return; }
    setError('');
    try {
      const payload = { ...story, authorName: user.username, status: targetStatus };
      if (id) { await api.put(`/stories/${id}`, payload); }
      else { await api.post('/stories', payload); }
      navigate('/my-stories');
    } catch (err) { setError(err.response?.data?.message || 'Failed to save story'); }
  };

  const activeScene = story.scenes.find(s => s.id === activeSceneId);
  const isStartScene = activeSceneId === 'start';
  const rootScene = story.scenes.find(s => s.id === story.initialSceneId);
  const unreachableScenes = story.scenes.filter(s => !isReachable(story.scenes, story.initialSceneId, s.id));

  if (!user) return <div style={{ paddingTop: '10rem', textAlign: 'center' }}>Please login to create stories.</div>;

  return (
    <div style={{ paddingTop: '7rem', paddingLeft: '2rem', paddingRight: '2rem', display: 'flex', gap: '2rem', minHeight: '100vh' }}>
      <style>{treeStyles}</style>
      <div className="glass-card" style={{ width: '300px', padding: '1.5rem', maxHeight: '85vh', overflowY: 'auto', flexShrink: 0 }}>
        <h3 style={{ marginBottom: '1.5rem', color: 'var(--accent)' }}>Scenes</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {story.scenes.map(s => (
            <div key={s.id} style={{ display: 'flex', gap: '0.3rem' }}>
              <button className="glass-card" style={{ padding: '0.6rem 0.8rem', flex: 1, background: s.id === activeSceneId ? 'var(--primary-gradient)' : 'rgba(255,255,255,0.05)', color: 'white', textAlign: 'left', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }} onClick={() => { setActiveSceneId(s.id); setShowTree(false); }}>
                {s.title || 'Untitled'}{s.isEnding ? ' 🏁' : ''}
              </button>
              {s.id !== 'start' && (
                <button onClick={() => deleteScene(s.id)} style={{ background: 'rgba(239,68,68,0.2)', border: 'none', color: '#ef4444', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', padding: '0 0.6rem' }}>✕</button>
              )}
            </div>
          ))}
          <button className="glass-card" style={{ padding: '0.6rem', border: '1px dashed var(--accent)', color: 'var(--accent)', background: 'transparent', cursor: 'pointer', fontSize: '0.9rem' }} onClick={addScene}>+ Add Scene</button>
        </div>
        <button className="glass-card" style={{ width: '100%', marginTop: '1rem', padding: '0.8rem', color: 'var(--accent)', background: 'transparent', border: '1px solid var(--accent)', cursor: 'pointer', fontSize: '0.9rem' }} onClick={() => setShowTree(!showTree)}>
          {showTree ? '✕ Close' : '🌳 Open'} Story Tree
        </button>
        {error && <p style={{ color: '#ef4444', marginTop: '1rem', fontSize: '0.85rem' }}>{error}</p>}
        <button className="glass-card" style={{ width: '100%', marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => validateAndSave('draft')}>Save as Draft</button>
        <button className="glass-card" style={{ width: '100%', marginTop: '0.5rem', padding: '1rem', background: 'var(--primary-gradient)', fontWeight: 'bold', cursor: 'pointer', color: 'white' }} onClick={() => validateAndSave('published')}>Publish Now</button>
      </div>

      {showTree ? (
        <div className="glass-card tree-container" style={{ flex: 1 }}>
          <ul className="tree-list" style={{ paddingTop: 0 }}>
            {rootScene && <TreeNode scene={rootScene} scenes={story.scenes} activeId={activeSceneId} onSelect={(sid) => { setActiveSceneId(sid); setShowTree(false); }} pathSet={null} />}
          </ul>
          {unreachableScenes.length > 0 && (
            <div className="unreachable-list">
              <div style={{ color: '#ef4444', marginBottom: '10px', fontSize: '0.9rem' }}>⚠ Unreachable Scenes (Not linked to tree):</div>
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {unreachableScenes.map(s => (
                  <div key={s.id} className="unreachable-node" onClick={() => { setActiveSceneId(s.id); setShowTree(false); }}>{s.title}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card" style={{ flex: 1, padding: '3rem', overflow: 'auto' }}>
          {isStartScene && (
            <>
              <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Story Title</label>
                  <input style={{ background: 'transparent', border: 'none', borderBottom: '2px solid var(--accent)', color: 'white', fontSize: '1.5rem', width: '100%', padding: '0.5rem 0', outline: 'none' }} value={story.title} onChange={(e) => setStory(prev => ({ ...prev, title: e.target.value }))} placeholder="Story Title" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Category</label>
                  <select className="glass-card" style={{ padding: '0.8rem', width: '100%', background: 'rgba(255,255,255,0.05)', color: 'white' }} value={story.category} onChange={(e) => setStory(prev => ({ ...prev, category: e.target.value }))}>
                    {['Fantasy', 'Adventure', 'Mystery', 'Sci-Fi', 'Horror'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Description</label>
                <input type="text" className="glass-card" style={{ padding: '1rem', width: '100%', background: 'rgba(255,255,255,0.05)', color: 'white' }} value={story.description} onChange={(e) => setStory(prev => ({ ...prev, description: e.target.value }))} placeholder="Brief summary..." />
              </div>
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Cover Image</label>
                <label className="glass-card" style={{ padding: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: uploading ? 'var(--text-secondary)' : 'var(--accent)', background: 'rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                  {uploading ? 'Uploading...' : story.coverImage ? 'Change Image' : 'Upload Image'}
                  <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
              </div>
              {story.coverImage && <div style={{ marginBottom: '2rem' }}><img src={story.coverImage} alt="Cover" style={{ maxWidth: '300px', maxHeight: '200px', objectFit: 'cover', borderRadius: '0.5rem', border: '1px solid var(--glass-border)' }} /><button onClick={() => setStory(prev => ({ ...prev, coverImage: '' }))} style={{ display: 'block', marginTop: '0.5rem', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}>Remove</button></div>}
              <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '2rem 0' }} />
            </>
          )}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Scene Title</label>
            <input type="text" className="glass-card" style={{ padding: '1rem', width: '100%', background: 'rgba(255,255,255,0.05)', color: 'white' }} value={activeScene.title} onChange={(e) => updateScene(activeSceneId, 'title', e.target.value)} placeholder="Scene Title" />
          </div>
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Scene Content</label>
            <div className="editor-toolbar">
              <button onClick={() => editor.chain().focus().toggleBold().run()} className={editor?.isActive('bold') ? 'is-active' : ''} title="Bold"><b>B</b></button>
              <button onClick={() => editor.chain().focus().toggleItalic().run()} className={editor?.isActive('italic') ? 'is-active' : ''} title="Italic"><i>I</i></button>
              <button onClick={() => editor.chain().focus().toggleStrike().run()} className={editor?.isActive('strike') ? 'is-active' : ''} title="Strikethrough"><s>S</s></button>
              <div className="separator" />
              <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor?.isActive('heading', { level: 1 }) ? 'is-active' : ''} title="Heading 1">H1</button>
              <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor?.isActive('heading', { level: 2 }) ? 'is-active' : ''} title="Heading 2">H2</button>
              <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor?.isActive('heading', { level: 3 }) ? 'is-active' : ''} title="Heading 3">H3</button>
              <div className="separator" />
              <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor?.isActive('bulletList') ? 'is-active' : ''} title="Bullet List">•≡</button>
              <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor?.isActive('orderedList') ? 'is-active' : ''} title="Numbered List">#≡</button>
              <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={editor?.isActive('blockquote') ? 'is-active' : ''} title="Quote">❝</button>
              <div className="separator" />
              <button onClick={handleImageUrlInsert} title="Image from URL">🖼️</button>
              <label style={{ position: 'relative', cursor: 'pointer' }} title="Upload Image">
                <button style={{ pointerEvents: 'none' }}>{editorUploading ? '⏳' : '📁'}</button>
                <input type="file" accept="image/*" onChange={handleEditorImageUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
              </label>
              <div className="separator" />
              <button onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">―</button>
            </div>
            <div className="glass-card" style={{ borderTop: 'none', borderRadius: '0 0 8px 8px', background: 'rgba(255,255,255,0.03)' }}>
              <EditorContent editor={editor} />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            <input type="checkbox" checked={activeScene.isEnding} onChange={(e) => updateScene(activeSceneId, 'isEnding', e.target.checked)} style={{ cursor: 'pointer' }} /> Mark as Ending Scene
          </label>
          {!activeScene.isEnding && (
            <div>
              <h4 style={{ marginBottom: '1.5rem', color: 'var(--accent)' }}>Choices</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {activeScene.choices.map((choice, index) => (
                  <div key={index} className="glass-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--accent)', fontSize: '0.8rem', width: '1.5rem' }}>✦</span>
                      <input type="text" placeholder="Choice text..." style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '0.6rem', borderRadius: '0.3rem', outline: 'none' }} value={choice.text} onChange={(e) => updateChoice(activeSceneId, index, 'text', e.target.value)} />
                      <button onClick={() => deleteChoice(activeSceneId, index)} style={{ background: 'rgba(239,68,68,0.2)', border: 'none', color: '#ef4444', borderRadius: '0.3rem', cursor: 'pointer', padding: '0.4rem 0.6rem' }}>✕</button>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ width: '1.5rem' }} />
                      <input type="text" placeholder="Hint: what happens if chosen..." style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: 'none', color: 'var(--text-secondary)', padding: '0.5rem', borderRadius: '0.3rem', outline: 'none', fontSize: '0.85rem' }} value={choice.hint} onChange={(e) => updateChoice(activeSceneId, index, 'hint', e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                      <span style={{ width: '1.5rem' }} />
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Goes to:</span>
                      <select style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '0.5rem', borderRadius: '0.3rem', outline: 'none', fontSize: '0.85rem' }} value={choice.nextSceneId} onChange={(e) => updateChoice(activeSceneId, index, 'nextSceneId', e.target.value)}>
                        <option value="">Select Target Scene</option>
                        {story.scenes.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
                <button className="glass-card" style={{ width: 'fit-content', padding: '0.8rem 1.5rem', color: 'var(--accent)', background: 'transparent', border: '1px solid var(--accent)', cursor: 'pointer' }} onClick={() => addChoice(activeSceneId)}>+ Add Choice</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StoryEditor;