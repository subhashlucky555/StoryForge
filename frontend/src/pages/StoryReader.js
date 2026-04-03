import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import { useAuth } from '../App';

function extractPlainText(html) {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || '';
}

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes === 0) return `${secs}s`;
  return `${minutes}m ${secs}s`;
}

const hasSpeechSynthesis = typeof window !== 'undefined' && 'speechSynthesis' in window;
const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
const hasSpeechRecognition = !!SpeechRecognition;

const treeCSS = `
  .map-bg { position: fixed; inset: 0; z-index: 1500; background: radial-gradient(circle at center, #1a1a3e 0%, #050510 100%); overflow: hidden; }
  .map-controls { position: fixed; top: 80px; right: 20px; z-index: 1600; display: flex; flex-direction: column; gap: 10px; }
  .map-btn { width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
  .map-btn:hover { background: rgba(255,255,255,0.2); transform: scale(1.1); }
  .map-header { position: fixed; top: 0; left: 0; right: 0; z-index: 1600; padding: 20px 30px; display: flex; justify-content: space-between; align-items: center; background: linear-gradient(to bottom, rgba(5,5,16,0.9), transparent); pointer-events: none; }
  .map-header > * { pointer-events: auto; }
  .map-viewport { width: 100%; height: 100%; cursor: grab; position: relative; overflow: hidden; }
  .map-viewport:active { cursor: grabbing; }
  .map-canvas { transform-origin: 0 0; position: absolute; top: 0; left: 0; padding: 100px 200px; min-width: 100%; display: flex; justify-content: center; }
  .tree-ul { display: flex; justify-content: center; list-style: none; padding: 30px 0 0 0; margin: 0; position: relative; }
  .tree-ul::before { content: ''; position: absolute; top: 0; left: 50%; width: 2px; height: 30px; background: rgba(131, 58, 180, 0.4); }
  .tree-li { display: flex; flex-direction: column; align-items: center; position: relative; padding: 30px 20px 0; }
  .tree-li::before { content: ''; position: absolute; top: 0; height: 2px; background: rgba(131, 58, 180, 0.4); width: 100%; }
  .tree-li::after { content: ''; position: absolute; top: 0; width: 2px; height: 30px; background: rgba(131, 58, 180, 0.4); }
  .tree-li:first-child::before { left: 50%; width: 50%; }
  .tree-li:last-child::before { right: 50%; width: 50%; left: 0; }
  .tree-li:only-child::before { display: none; }
  .tree-li:first-child::after, .tree-li:last-child::after, .tree-li:only-child::after { left: 50%; }
  .tree-node { position: relative; z-index: 2; padding: 12px 24px; border-radius: 12px; background: rgba(20, 20, 40, 0.8); border: 2px solid rgba(255,255,255,0.1); color: white; cursor: pointer; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); font-size: 0.95rem; text-align: center; backdrop-filter: blur(10px); white-space: nowrap; box-shadow: 0 4px 15px rgba(0,0,0,0.3); }
  .tree-node:hover { transform: scale(1.08); border-color: var(--accent); box-shadow: 0 0 20px rgba(131, 58, 180, 0.4); }
  .tree-node.active { background: linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045); border-color: transparent; color: white; font-weight: bold; box-shadow: 0 0 30px rgba(131, 58, 180, 0.6); transform: scale(1.1); }
  .tree-node.on-path { border-color: rgba(131, 58, 180, 0.6); background: rgba(131, 58, 180, 0.2); box-shadow: 0 0 15px rgba(131, 58, 180, 0.3); }
  .tree-label { margin-top: 15px; margin-bottom: 20px; font-size: 0.8rem; color: rgba(255,255,255,0.5); max-width: 150px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; height: 20px; transition: 0.2s; }
  .tree-li:hover > .tree-label { color: var(--accent); }
  .scene-content p { margin-bottom: 1rem; }
  .scene-content img { max-width: 100%; border-radius: 8px; margin: 1rem 0; }
  .scene-content h1, .scene-content h2, .scene-content h3 { color: var(--accent); margin: 1rem 0 0.5rem; }
  .scene-content em { color: var(--accent); }
  .scene-content strong { color: white; font-weight: bold; }
  .scene-content ul, .scene-content ol { padding-left: 1.5rem; margin-bottom: 1rem; }
  .scene-content li { margin-bottom: 0.25rem; }
  .scene-content blockquote { border-left: 3px solid var(--accent); padding-left: 1rem; margin: 1rem 0; color: var(--text-secondary); font-style: italic; }
  .scene-content hr { border: none; border-top: 1px solid var(--glass-border); margin: 1.5rem 0; }
  .tts-highlight { 
    color: #ffffff !important; 
    text-shadow: 0 0 8px #833ab4, 0 0 15px rgba(253, 29, 29, 0.6), 0 0 25px rgba(252, 176, 69, 0.4); 
    background: transparent !important; 
    transition: text-shadow 0.1s ease-in-out; 
    border-radius: 2px;
  }
  .voice-pulse { animation: voicePulse 1.5s ease-in-out infinite; }
  @keyframes voicePulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); } 50% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); } }
  .stats-card { background: linear-gradient(135deg, rgba(131,58,180,0.15), rgba(253,29,29,0.08), rgba(252,176,69,0.08)); border: 1px solid rgba(131,58,180,0.3); }
  .stat-number { font-size: 2.5rem; font-weight: bold; background: linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; line-height: 1.2; }
  .comment-item { padding: 0.8rem; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); }
  .voice-select { background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 0.5rem; border-radius: 0.5rem; font-size: 0.8rem; max-width: 180px; cursor: pointer; outline: none; backdrop-filter: blur(10px); }
  .voice-select option { background: #1a1a3e; color: white; }
  .side-controls { position: absolute; left: 2rem; top: 7rem; display: flex; flex-direction: column; gap: 10px; z-index: 10; background: rgba(15, 23, 42, 0.8); padding: 15px; border-radius: 12px; border: 1px solid var(--glass-border); backdrop-filter: blur(10px); }
  .side-btn { width: 100%; padding: 0.6rem 0.8rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: white; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; transition: 0.2s; }
  .side-btn:hover { background: rgba(255,255,255,0.1); }
  .side-btn.active { background: rgba(131,58,180,0.3); border-color: var(--accent); color: var(--accent); }
  input[type="range"].vol-slider { -webkit-appearance: none; width: 100%; height: 4px; background: rgba(255,255,255,0.2); border-radius: 4px; outline: none; cursor: pointer; }
  input[type="range"].vol-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; background: var(--accent); border-radius: 50%; cursor: pointer; }
`;

const TreeNode = ({ scene, scenes, activeId, onSelect, visited = new Set(), pathSet, isDragging }) => {
  if (visited.has(scene.id)) return null;
  const newVisited = new Set(visited);
  newVisited.add(scene.id);
  const isActive = scene.id === activeId;
  const onPath = pathSet && pathSet.has(scene.id);

  return (
    <li className="tree-li">
      <div
        className={`tree-node ${isActive ? 'active' : ''} ${onPath ? 'on-path' : ''}`}
        onClick={(e) => { if (!isDragging) onSelect(scene.id); }}
      >
        {scene.title}{scene.isEnding ? ' 🏁' : ''}
      </div>
      {scene.choices.length > 0 && (
        <ul className="tree-ul">
          {scene.choices.map((choice, i) => {
            const next = scenes.find(s => s.id === choice.nextSceneId);
            if (!next) return null;
            return (
              <li key={i} className="tree-li">
                <span className="tree-label" title={choice.text}>{choice.text || 'Empty'}</span>
                <TreeNode scene={next} scenes={scenes} activeId={activeId} onSelect={onSelect} visited={newVisited} pathSet={pathSet} isDragging={isDragging} />
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
};

function findPathToScene(scenes, initialSceneId, targetSceneId) {
  const queue = [{ sceneId: initialSceneId, path: [initialSceneId], choices: [] }];
  const visited = new Set([initialSceneId]);
  while (queue.length > 0) {
    const { sceneId, path, choices } = queue.shift();
    if (sceneId === targetSceneId) return { path, choices };
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) continue;
    for (const choice of scene.choices) {
      if (choice.nextSceneId && !visited.has(choice.nextSceneId)) {
        visited.add(choice.nextSceneId);
        queue.push({ sceneId: choice.nextSceneId, path: [...path, choice.nextSceneId], choices: [...choices, { from: sceneId, text: choice.text, to: choice.nextSceneId }] });
      }
    }
  }
  return null;
}

const StoryReader = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [story, setStory] = useState(null);
  const [currentScene, setCurrentScene] = useState(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [phase, setPhase] = useState('lobby');
  const [showTree, setShowTree] = useState(false);
  const [savedProgress, setSavedProgress] = useState(null);
  const [divergeModal, setDivergeModal] = useState(null);
  const [reviewForm, setReviewForm] = useState({ score: 5, comment: '' });
  const [reviewError, setReviewError] = useState('');

  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [ttsVolume, setTtsVolume] = useState(1);
  const [visitedScenes, setVisitedScenes] = useState(new Set());
  const [readingStartTime] = useState(Date.now());
  const [showStats, setShowStats] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [sceneComments, setSceneComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const mapRef = useRef(null);
  const [mapTransform, setMapTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const contentRef = useRef(null);
  const ttsSpansRef = useRef([]);
  const currentCharRef = useRef(-1);
  const utteranceRef = useRef(null);
  const recognitionRef = useRef(null);
  const simulationIntervalRef = useRef(null);

  const ttsEnabledRef = useRef(false);
  const voiceEnabledRef = useRef(false);
  const currentSceneRef = useRef(null);
  const selectedVoiceRef = useRef(null);
  const ttsVolumeRef = useRef(1);
  const handleChoiceRef = useRef();
  const speakSceneRef = useRef();

  useEffect(() => { ttsEnabledRef.current = ttsEnabled; }, [ttsEnabled]);
  useEffect(() => { voiceEnabledRef.current = voiceEnabled; }, [voiceEnabled]);
  useEffect(() => { currentSceneRef.current = currentScene; }, [currentScene]);
  useEffect(() => { selectedVoiceRef.current = selectedVoice; }, [selectedVoice]);
  useEffect(() => { ttsVolumeRef.current = ttsVolume; }, [ttsVolume]);

  const clearTTSHighlight = useCallback(() => {
    ttsSpansRef.current.forEach(span => span.classList.remove('tts-highlight'));
  }, []);

  const updateTTSHighlight = useCallback(() => {
    const container = contentRef.current;
    if (!container) return;
    const charIndex = currentCharRef.current;
    if (charIndex < 0) { clearTTSHighlight(); return; }

    let newHighlighted = null;
    ttsSpansRef.current.forEach(span => {
      const start = parseInt(span.dataset.charStart);
      const end = parseInt(span.dataset.charEnd);
      if (charIndex >= start && charIndex < end) {
        span.classList.add('tts-highlight');
        newHighlighted = span;
      } else {
        span.classList.remove('tts-highlight');
      }
    });

    if (newHighlighted) {
      const rect = newHighlighted.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      if (rect.bottom > containerRect.bottom - 60 || rect.top < containerRect.top + 60) {
        const offsetTop = newHighlighted.offsetTop - container.offsetTop;
        const scrollTarget = offsetTop - (container.clientHeight / 2) + (newHighlighted.clientHeight / 2);
        container.scrollTo({ top: Math.max(0, scrollTarget), behavior: 'smooth' });
      }
    }
  }, [clearTTSHighlight]);

  const setupTTSSpans = useCallback(() => {
    const container = contentRef.current;
    if (!container) return;
    ttsSpansRef.current.forEach(span => {
      const textNode = document.createTextNode(span.textContent);
      if (span.parentNode) span.parentNode.replaceChild(textNode, span);
    });
    ttsSpansRef.current = [];
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let charOffset = 0;
    while (walker.nextNode()) {
      const textNode = walker.currentNode;
      if (!textNode.textContent.trim()) { charOffset += textNode.textContent.length; continue; }
      const text = textNode.textContent;
      const fragment = document.createDocumentFragment();
      const parts = text.split(/(\s+)/);
      parts.forEach(part => {
        if (!part) return;
        if (part.trim()) {
          const span = document.createElement('span');
          span.dataset.charStart = charOffset;
          span.dataset.charEnd = charOffset + part.length;
          span.textContent = part;
          fragment.appendChild(span);
          ttsSpansRef.current.push(span);
        } else {
          fragment.appendChild(document.createTextNode(part));
        }
        charOffset += part.length;
      });
      if (textNode.parentNode) textNode.parentNode.replaceChild(fragment, textNode);
    }
  }, []);

  const teardownTTSSpans = useCallback(() => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    ttsSpansRef.current.forEach(span => {
      const textNode = document.createTextNode(span.textContent);
      if (span.parentNode) span.parentNode.replaceChild(textNode, span);
    });
    ttsSpansRef.current = [];
    currentCharRef.current = -1;
  }, []);

  const stopSpeaking = useCallback(() => {
    if (hasSpeechSynthesis) window.speechSynthesis.cancel();
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    setIsSpeaking(false);
    currentCharRef.current = -1;
    teardownTTSSpans();
  }, [teardownTTSSpans]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch (e) { } recognitionRef.current = null; }
    setIsListening(false);
    setVoiceTranscript('');
  }, []);

  const speakChoices = useCallback(() => {
    const scene = currentSceneRef.current;
    if (!scene || !scene.choices || scene.choices.length === 0) {
      setIsSpeaking(false);
      if (scene && scene.isEnding) {
        setTimeout(() => setShowStats(true), 500);
      } else if (voiceEnabledRef.current) {
        startListening();
      }
      return;
    }
    let text = '';
    if (scene.choices.length === 2) {
      text = `You may either ${scene.choices[0].text}, or ${scene.choices[1].text}.`;
    } else if (scene.choices.length === 1) {
      text = `You can choose to ${scene.choices[0].text}.`;
    } else {
      text = `Your options are: ${scene.choices.map(c => c.text).join(', ')}.`;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoiceRef.current) utterance.voice = selectedVoiceRef.current;
    utterance.volume = ttsVolumeRef.current;
    utterance.rate = 0.9;
    utterance.onend = () => { setIsSpeaking(false); teardownTTSSpans(); if (voiceEnabledRef.current) startListening(); };
    utterance.onerror = () => { setIsSpeaking(false); teardownTTSSpans(); };
    utteranceRef.current = utterance;
    if (hasSpeechSynthesis) window.speechSynthesis.speak(utterance);
  }, [teardownTTSSpans]);

  const speakScene = useCallback(() => {
    if (!hasSpeechSynthesis) return;
    const scene = currentSceneRef.current;
    if (!scene) return;
    stopSpeaking();
    stopListening();
    setTimeout(() => {
      const plainText = extractPlainText(scene.content);
      if (plainText.trim()) {
        setupTTSSpans();
        const utterance = new SpeechSynthesisUtterance(plainText);
        if (selectedVoiceRef.current) utterance.voice = selectedVoiceRef.current;
        utterance.volume = ttsVolumeRef.current;
        utterance.rate = 0.9;

        let boundaryFired = false;

        const startSimulation = () => {
          if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
          let simIndex = 0;
          const spans = ttsSpansRef.current;
          const rate = 0.9;
          const wpm = 150 * rate;
          const intervalMs = (60 / wpm) * 1000;

          simulationIntervalRef.current = setInterval(() => {
            if (simIndex < spans.length) {
              currentCharRef.current = parseInt(spans[simIndex].dataset.charStart);
              updateTTSHighlight();
              simIndex++;
            } else {
              clearInterval(simulationIntervalRef.current);
            }
          }, intervalMs);
        };

        utterance.onboundary = (event) => {
          if (!boundaryFired) {
            boundaryFired = true;
            if (simulationIntervalRef.current) {
              clearInterval(simulationIntervalRef.current);
              simulationIntervalRef.current = null;
            }
          }
          currentCharRef.current = event.charIndex;
          updateTTSHighlight();
        };

        utterance.onend = () => {
          currentCharRef.current = -1;
          clearTTSHighlight();
          if (simulationIntervalRef.current) {
            clearInterval(simulationIntervalRef.current);
            simulationIntervalRef.current = null;
          }
          setTimeout(() => speakChoices(), 300);
        };

        utterance.onerror = () => {
          setIsSpeaking(false);
          teardownTTSSpans();
          if (simulationIntervalRef.current) {
            clearInterval(simulationIntervalRef.current);
            simulationIntervalRef.current = null;
          }
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);

        setTimeout(() => {
          if (!boundaryFired && window.speechSynthesis.speaking) {
            startSimulation();
          }
        }, 500);

      } else {
        speakChoices();
      }
    }, 100);
  }, [stopSpeaking, stopListening, setupTTSSpans, updateTTSHighlight, clearTTSHighlight, teardownTTSSpans, speakChoices]);

  useEffect(() => { speakSceneRef.current = speakScene; }, [speakScene]);

  const startListening = useCallback(() => {
    if (!hasSpeechRecognition) return;
    stopListening();
    const scene = currentSceneRef.current;
    if (!scene || !scene.choices || scene.choices.length === 0) return;
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.onresult = (event) => {
        const last = event.results[event.results.length - 1];
        const transcript = last[0].transcript;
        setVoiceTranscript(transcript);
        if (last.isFinal) processVoiceResult(transcript);
      };
      recognition.onerror = (event) => { if (event.error === 'not-allowed') setVoiceEnabled(false); };
      recognition.onend = () => {
        if (voiceEnabledRef.current && currentSceneRef.current && currentSceneRef.current.choices && currentSceneRef.current.choices.length > 0) {
          setIsListening(false);
          setTimeout(() => { if (voiceEnabledRef.current) startListening(); }, 200);
        } else { setIsListening(false); }
      };
      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch (e) { }
  }, [stopListening]);

  const processVoiceResult = useCallback((transcript) => {
    const scene = currentSceneRef.current;
    if (!scene || !scene.choices) return;
    const lower = transcript.toLowerCase().trim();
    const stopWords = new Set(['the', 'and', 'but', 'for', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'are', 'has', 'have', 'been', 'from', 'this', 'that', 'with', 'they', 'will', 'what', 'when', 'make', 'like', 'just', 'over', 'such', 'take', 'than', 'them', 'very', 'some', 'into', 'also', 'then', 'now', 'get', 'got', 'go', 'to', 'of', 'in', 'is', 'it', 'on', 'do', 'be', 'so', 'no', 'if', 'or', 'my', 'me', 'we', 'us', 'am', 'an', 'as', 'at', 'by', 'he', 'id', 'im', 'its', 'let', 'may', 'nor', 'off', 'per', 'put', 'she', 'too', 'up', 'yes']);
    const matches = [];
    scene.choices.forEach((choice, index) => {
      const words = choice.text.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
      const matched = words.filter(w => lower.includes(w));
      if (matched.length > 0) matches.push({ index, matchCount: matched.length, totalWords: words.length, ratio: matched.length / Math.max(words.length, 1) });
    });
    matches.sort((a, b) => b.ratio - a.ratio);
    if (matches.length === 1 || (matches.length > 1 && matches[0].ratio > matches[1].ratio * 1.5)) {
      const choice = scene.choices[matches[0].index];
      if (choice.nextSceneId && handleChoiceRef.current) handleChoiceRef.current(choice.nextSceneId);
    }
  }, []);

  useEffect(() => {
    if (voiceEnabled) {
      if (!isSpeaking && phase === 'reading' && currentScene && currentScene.choices && currentScene.choices.length > 0 && !isListening) {
        startListening();
      }
    } else {
      if (isListening) stopListening();
    }
  }, [voiceEnabled]);

  useEffect(() => {
    if (!hasSpeechSynthesis) return;
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) {
        setVoices(v);
        if (!selectedVoiceRef.current) {
          const englishVoice = v.find(voice => voice.lang.startsWith('en'));
          setSelectedVoice(englishVoice || v[0]);
        }
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  useEffect(() => {
    if (ttsEnabled && phase === 'reading' && currentScene) {
      if (hasSpeechSynthesis) window.speechSynthesis.cancel();
      speakScene();
    }
    if (!ttsEnabled && phase === 'reading') { stopSpeaking(); stopListening(); }
    return () => { stopSpeaking(); stopListening(); };
  }, [ttsEnabled, currentScene?.id, phase]);

  useEffect(() => {
    if (selectedVoice && isSpeaking) {
      stopSpeaking();
      const timer = setTimeout(() => { if (ttsEnabledRef.current) speakSceneRef.current(); }, 150);
      return () => clearTimeout(timer);
    }
  }, [selectedVoice]);

  useEffect(() => {
    if (isSpeaking && ttsVolumeRef.current !== ttsVolume) {
      stopSpeaking();
      const timer = setTimeout(() => { if (ttsEnabledRef.current) speakSceneRef.current(); }, 150);
      return () => clearTimeout(timer);
    }
  }, [ttsVolume]);

  const fetchSceneComments = useCallback(async (sceneId) => {
    if (!sceneId) return;
    try { const { data } = await api.get(`/stories/${id}/scenes/${sceneId}/comments`); setSceneComments(data || []); }
    catch (e) { setSceneComments([]); }
  }, [id]);

  useEffect(() => {
    if (phase === 'reading' && currentScene) { fetchSceneComments(currentScene.id); setShowComments(false); }
  }, [currentScene?.id, phase, fetchSceneComments]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const { data: storyData } = await api.get(`/stories/${id}`);
        setStory(storyData);
        if (user) { try { const { data: progress } = await api.get(`/progress/${id}`); if (progress && progress.currentSceneId) setSavedProgress(progress); } catch (e) { } }
      } catch (err) { navigate('/library'); }
      setLoading(false);
    };
    fetchAll();
  }, [id, user]);

  useEffect(() => { if (showTree) setMapTransform({ x: 0, y: 0, scale: 1 }); }, [showTree]);
  useEffect(() => { return () => { if (hasSpeechSynthesis) window.speechSynthesis.cancel(); stopListening(); }; }, []);

  const handleMapWheel = (e) => { e.preventDefault(); setMapTransform(prev => ({ ...prev, scale: Math.max(0.2, Math.min(2, prev.scale - e.deltaY * 0.001)) })); };
  const handleMapMouseDown = (e) => { if (e.target.closest('.tree-node') || e.target.closest('.map-btn')) return; setIsDragging(true); dragStart.current = { x: e.clientX - mapTransform.x, y: e.clientY - mapTransform.y }; };
  const handleMapMouseMove = (e) => { if (!isDragging) return; setMapTransform(prev => ({ ...prev, x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y })); };
  const handleMapMouseUp = () => { setTimeout(() => setIsDragging(false), 50); };

  const startReading = async (fromBeginning) => {
    if (fromBeginning && user) { try { await api.delete(`/progress/${id}`); } catch (e) { } setSavedProgress(null); }
    setCurrentScene(story.scenes.find(s => s.id === story.initialSceneId));
    setHistory([]);
    setVisitedScenes(new Set([story.initialSceneId]));
    setPhase('reading');
    stopSpeaking(); stopListening();
  };

  const handleChoice = async (nextSceneId) => {
    if (!story || !currentScene) return;
    const nextScene = story.scenes.find(s => s.id === nextSceneId);
    if (!nextScene) return;
    stopSpeaking(); stopListening();
    const newHistory = [...history, currentScene.id];
    setHistory(newHistory);
    setVisitedScenes(prev => new Set([...prev, nextSceneId]));
    setCurrentScene(nextScene);
    if (user) { try { await api.post('/progress', { storyId: id, currentSceneId: nextSceneId, choicesMade: newHistory }); } catch (e) { } }
    if (nextScene.isEnding && !ttsEnabledRef.current) {
      setTimeout(() => setShowStats(true), 600);
    }
  };

  useEffect(() => { handleChoiceRef.current = handleChoice; }, [handleChoice, story, currentScene, history]);

  const goBack = () => { if (history.length === 0) return; stopSpeaking(); stopListening(); const prevId = history[history.length - 1]; setHistory(history.slice(0, -1)); setCurrentScene(story.scenes.find(s => s.id === prevId)); };

  const submitSceneComment = async () => {
    if (!commentText.trim() || !user) return;
    setCommentSubmitting(true);
    try { const { data } = await api.post(`/stories/${id}/scenes/${currentScene.id}/comments`, { text: commentText.trim() }); setSceneComments(prev => [...prev, data]); setCommentText(''); } catch (e) { }
    setCommentSubmitting(false);
  };

  const handleTreeClick = (targetSceneId) => {
    const currentPathSet = new Set([story.initialSceneId, ...history, currentScene.id]);
    if (currentPathSet.has(targetSceneId)) {
      if (targetSceneId === currentScene.id) return;
      const idx = history.indexOf(targetSceneId);
      if (idx > -1) { stopSpeaking(); stopListening(); setHistory(history.slice(0, idx)); setCurrentScene(story.scenes.find(s => s.id === targetSceneId)); }
      return;
    }
    const targetPath = findPathToScene(story.scenes, story.initialSceneId, targetSceneId);
    if (!targetPath) return;
    const currentFullPath = [story.initialSceneId, ...history, currentScene.id];
    let divergencePoint = null; let divergenceChoice = null;
    for (let i = 0; i < Math.min(currentFullPath.length, targetPath.path.length); i++) {
      if (currentFullPath[i] !== targetPath.path[i]) {
        if (i > 0) { divergencePoint = story.scenes.find(s => s.id === currentFullPath[i - 1]); divergenceChoice = targetPath.choices[i - 1]; }
        break;
      }
    }
    if (!divergencePoint) { divergencePoint = story.scenes.find(s => s.id === currentFullPath[currentFullPath.length - 1]); divergenceChoice = targetPath.choices[currentFullPath.length - 1] || targetPath.choices[0]; }
    setDivergeModal({ targetSceneId, divergencePoint, divergenceChoice, targetPath });
  };

  const confirmDiverge = () => {
    if (!divergeModal) return; stopSpeaking(); stopListening();
    const divSceneId = divergeModal.divergencePoint.id; const newHistory = [story.initialSceneId];
    for (const choice of divergeModal.targetPath.choices) { if (choice.to === divSceneId) break; newHistory.push(choice.to); }
    setHistory(newHistory); setCurrentScene(divergeModal.divergencePoint); setVisitedScenes(prev => new Set([...prev, divSceneId])); setDivergeModal(null); setShowTree(false);
  };

  const submitReview = async () => {
    if (!reviewForm.comment.trim()) { setReviewError('Please write a comment'); return; } setReviewError('');
    try { const { data } = await api.post(`/stories/${id}/rate`, reviewForm); setStory(data); setReviewForm({ score: 5, comment: '' }); } catch (err) { setReviewError('Failed to submit review'); }
  };

  const toggleTTS = () => { if (ttsEnabled) { stopSpeaking(); stopListening(); setTtsEnabled(false); } else { setTtsEnabled(true); } };
  const toggleVoice = () => { if (voiceEnabled) { stopListening(); setVoiceEnabled(false); } else { setVoiceEnabled(true); } };

  if (loading) return <div style={{ paddingTop: '10rem', textAlign: 'center' }}>Opening the tome...</div>;
  if (!story) return null;

  const rootScene = story.scenes.find(s => s.id === story.initialSceneId);
  const currentPathSet = currentScene ? new Set([story.initialSceneId, ...history, currentScene.id]) : new Set();
  const statusColor = story.status === 'completed' ? '#22c55e' : '#3b82f6';
  const elapsedMs = Date.now() - readingStartTime;
  const formattedStatus = story.status.charAt(0).toUpperCase() + story.status.slice(1);

  if (phase === 'lobby') {
    return (
      <div style={{ paddingTop: '8rem', paddingBottom: '4rem', paddingLeft: '2rem', paddingRight: '2rem', display: 'flex', justifyContent: 'center' }}>
        <div className="glass-card animate-fade-in" style={{ maxWidth: '700px', width: '100%', padding: '3rem' }}>
          <button onClick={() => navigate('/library')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '1.5rem' }}>← Back to Library</button>
          {story.coverImage && <img src={story.coverImage} alt="Cover" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '0.5rem', marginBottom: '2rem' }} />}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ background: 'var(--accent)', color: 'black', fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontWeight: 'bold' }}>{story.category}</span>
            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '1rem', background: `${statusColor}22`, color: statusColor }}>{formattedStatus}</span>
          </div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{story.title}</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.95rem' }}>By {story.authorName || 'Explorer'}</p>
          <p style={{ color: 'var(--text-primary)', marginBottom: '2rem', lineHeight: '1.7' }}>{story.description}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
            <div style={{ color: '#fbbf24' }}>{'★'.repeat(Math.round(story.averageRating))}{'☆'.repeat(5 - Math.round(story.averageRating))}</div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{story.averageRating.toFixed(1)} ({story.ratings.length} reviews)</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
            <button className="glass-card" style={{ padding: '1rem 2rem', background: 'var(--primary-gradient)', color: 'white', fontWeight: 'bold', cursor: 'pointer', flex: 1 }} onClick={() => startReading(true)}>Start from Beginning</button>
            {savedProgress && <button className="glass-card" style={{ padding: '1rem 2rem', cursor: 'pointer', flex: 1, border: '1px solid var(--accent)', color: 'var(--accent)' }} onClick={() => startReading(false)}>Continue Reading</button>}
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '2rem 0' }} />
          <h3 style={{ marginBottom: '1.5rem' }}>Reviews ({story.ratings.length})</h3>
          {story.ratings.length === 0 && <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>No reviews yet. Be the first!</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto', marginBottom: '1.5rem' }}>
            {story.ratings.map((r, i) => (
              <div key={i} className="glass-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{r.username || 'Anonymous'}</span>
                  <span style={{ color: '#fbbf24', fontSize: '0.85rem' }}>{'★'.repeat(r.score)}{'☆'.repeat(5 - r.score)}</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{r.comment}</p>
              </div>
            ))}
          </div>
          {user && (
            <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)' }}>
              <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Write a Review</h4>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Rating:</span>
                {[1, 2, 3, 4, 5].map(s => (
                  <span key={s} style={{ cursor: 'pointer', fontSize: '1.3rem', color: s <= reviewForm.score ? '#fbbf24' : 'rgba(255,255,255,0.2)' }} onClick={() => setReviewForm({ ...reviewForm, score: s })}>★</span>
                ))}
              </div>
              <textarea placeholder="Share your thoughts..." style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', borderRadius: '0.3rem', outline: 'none', minHeight: '80px', marginBottom: '0.5rem', resize: 'vertical' }} value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} />
              {reviewError && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{reviewError}</p>}
              <button className="glass-card" style={{ padding: '0.7rem 1.5rem', background: 'var(--primary-gradient)', color: 'white', cursor: 'pointer', fontWeight: 'bold' }} onClick={submitReview}>Submit Review</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', position: 'relative' }}>
      <style>{treeCSS}</style>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: story.coverImage ? `linear-gradient(rgba(15,23,42,0.95), rgba(15,23,42,0.95)), url(${story.coverImage}) center/cover` : 'none' }}>

        <button onClick={() => setShowTree(true)} style={{ position: 'absolute', top: '7rem', right: '2rem', background: 'rgba(131,58,180,0.2)', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '0.5rem 1.2rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}>🌳 Story Map</button>

        <div className="side-controls">
          <button className="side-btn" onClick={() => { stopSpeaking(); stopListening(); setTtsEnabled(false); setVoiceEnabled(false); setPhase('lobby'); }}>← Details</button>

          {hasSpeechSynthesis && (
            <button className={`side-btn ${ttsEnabled ? 'active' : ''}`} onClick={toggleTTS}>
              {isSpeaking ? '⏸' : '🔊'} {ttsEnabled ? 'On' : 'Off'}
            </button>
          )}

          {ttsEnabled && voices.length > 0 && (
            <select className="voice-select" value={selectedVoice?.name || ''} onChange={(e) => { const v = voices.find(voice => voice.name === e.target.value); if (v) setSelectedVoice(v); }}>
              {voices.filter(v => v.lang.startsWith('en')).map((v) => (
                <option key={v.name} value={v.name}>{v.name.split(' ').slice(0, 3).join(' ')}</option>
              ))}
            </select>
          )}

          {ttsEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <span>🔊 Vol</span>
                <span>{Math.round(ttsVolume * 100)}%</span>
              </div>
              <input type="range" className="vol-slider" min="0" max="2" step="0.1" value={ttsVolume} onChange={(e) => setTtsVolume(parseFloat(e.target.value))} />
            </div>
          )}

          {hasSpeechRecognition && (
            <button className={`side-btn ${voiceEnabled ? 'active' : ''}`} onClick={toggleVoice} style={voiceEnabled ? { borderColor: '#ef4444', color: '#ef4444' } : {}}>
              🎤 {voiceEnabled ? 'On' : 'Off'}
            </button>
          )}
        </div>

        {isListening && voiceTranscript && (
          <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', padding: '8px 20px', borderRadius: '20px', color: '#ef4444', fontSize: '0.85rem', zIndex: 10, maxWidth: '450px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', backdropFilter: 'blur(10px)' }}>
            🎧 {voiceTranscript}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div key={currentScene.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} className="glass-card" style={{ maxWidth: '750px', width: '100%', padding: '3rem', textAlign: 'center', boxShadow: '0 0 50px rgba(131,58,180,0.15)', position: 'relative' }}>
            <h2 style={{ fontSize: '1rem', color: 'var(--accent)', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px' }}>{story.title}</h2>
            <h1 style={{ fontSize: '2.2rem', marginBottom: '2rem' }}>{currentScene.title}</h1>
            <div ref={contentRef} className="scene-content" style={{ fontSize: '1.15rem', lineHeight: '1.8', color: 'var(--text-primary)', marginBottom: '1.5rem', textAlign: 'left', maxHeight: '50vh', overflowY: 'auto', paddingRight: '10px' }} dangerouslySetInnerHTML={{ __html: currentScene.content || '' }} />

            <button onClick={() => setShowComments(!showComments)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '1rem', padding: '4px 8px', borderRadius: '6px' }}>
              💬 {sceneComments.length} comment{sceneComments.length !== 1 ? 's' : ''} {showComments ? '▾' : '▸'}
            </button>

            <AnimatePresence>
              {showComments && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} style={{ overflow: 'hidden', marginBottom: '2rem' }}>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    {sceneComments.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>No comments on this scene yet</p>}
                    {sceneComments.map((c, i) => (
                      <div key={i} className="comment-item">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'white' }}>{c.username || 'Anonymous'}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}</span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>{c.text}</p>
                      </div>
                    ))}
                  </div>
                  {user && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="text" placeholder="React to this scene..." value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submitSceneComment(); }} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', padding: '0.6rem', borderRadius: '0.3rem', outline: 'none', fontSize: '0.9rem' }} />
                      <button onClick={submitSceneComment} disabled={commentSubmitting || !commentText.trim()} style={{ background: 'var(--primary-gradient)', border: 'none', color: 'white', padding: '0.6rem 1rem', borderRadius: '0.3rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', opacity: (commentSubmitting || !commentText.trim()) ? 0.5 : 1 }}>
                        {commentSubmitting ? '...' : '➤'}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {currentScene.choices && currentScene.choices.length > 0 ? (
                currentScene.choices.map((choice, index) => (
                  <button key={index} className={`glass-card ${isListening ? 'voice-pulse' : ''}`} style={{ padding: '1.2rem', fontSize: '1.05rem', textAlign: 'left', background: 'rgba(255,255,255,0.03)', border: `1px solid ${isListening ? 'rgba(239, 68, 68, 0.4)' : 'var(--glass-border)'}`, transition: 'all 0.2s ease', cursor: 'pointer' }} onClick={() => handleChoice(choice.nextSceneId)} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                    <div><span style={{ color: 'var(--accent)', marginRight: '0.8rem' }}>✦</span>{choice.text}{isListening && <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: '#ef4444' }}>🎤</span>}</div>
                    {choice.hint && <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem', marginLeft: '1.8rem', fontStyle: 'italic' }}>{choice.hint}</div>}
                  </button>
                ))
              ) : (
                <div style={{ marginTop: '2rem' }}>
                  <h3 className="gradient-text" style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>THE END</h3>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="glass-card" style={{ padding: '1rem 2rem', background: 'var(--primary-gradient)', color: 'white', cursor: 'pointer' }} onClick={() => { stopSpeaking(); stopListening(); setTtsEnabled(false); setVoiceEnabled(false); setPhase('lobby'); }}>Story Details</button>
                    <button className="glass-card" style={{ padding: '1rem 2rem', cursor: 'pointer' }} onClick={() => { stopSpeaking(); stopListening(); navigate('/library'); }}>Return to Library</button>
                  </div>
                </div>
              )}
            </div>

            {history.length > 0 && (
              <button onClick={goBack} style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>← Go Back</button>
            )}
          </motion.div>
        </AnimatePresence>
        <div style={{ marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{user ? 'Progress saved automatically' : 'Login to save progress'}</div>
      </div>

      <AnimatePresence>
        {showTree && (
          <motion.div className="map-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onWheel={handleMapWheel} onMouseDown={handleMapMouseDown} onMouseMove={handleMapMouseMove} onMouseUp={handleMapMouseUp} onMouseLeave={handleMapMouseUp} ref={mapRef}>
            <div className="map-header">
              <h2 style={{ color: 'var(--accent)', margin: 0, fontSize: '1.5rem' }}>✦ Story Constellation</h2>
              <button className="map-btn" onClick={() => setShowTree(false)} style={{ width: 'auto', padding: '0 15px', borderRadius: '20px', fontSize: '0.9rem' }}>✕ Close</button>
            </div>
            <div className="map-controls">
              <button className="map-btn" onClick={() => setMapTransform(p => ({ ...p, scale: Math.min(2, p.scale + 0.2) }))}>+</button>
              <button className="map-btn" onClick={() => setMapTransform(p => ({ ...p, scale: Math.max(0.2, p.scale - 0.2) }))}>−</button>
              <button className="map-btn" onClick={() => setMapTransform({ x: 0, y: 0, scale: 1 })} title="Reset View">⌂</button>
            </div>
            <div className="map-viewport">
              <div className="map-canvas" style={{ transform: `translate(${mapTransform.x}px, ${mapTransform.y}px) scale(${mapTransform.scale})` }}>
                <ul className="tree-ul" style={{ paddingTop: 0 }}>{rootScene && <TreeNode scene={rootScene} scenes={story.scenes} activeId={currentScene.id} onSelect={handleTreeClick} pathSet={currentPathSet} isDragging={isDragging} />}</ul>
              </div>
            </div>
            <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'rgba(20,20,40,0.8)', padding: '10px 20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', color: 'var(--text-secondary)', fontSize: '0.85rem', zIndex: 1600 }}>📍 <span style={{ color: 'white' }}>{currentScene.title}</span> &nbsp;|&nbsp; Scroll to zoom &nbsp;|&nbsp; Drag to pan</div>
          </motion.div>
        )}
      </AnimatePresence>

      {divergeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }} onClick={() => setDivergeModal(null)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card" style={{ padding: '2.5rem', maxWidth: '500px', width: '100%', background: 'rgba(15, 23, 42, 0.95)', borderColor: 'var(--accent)' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: 'var(--accent)', marginBottom: '1.5rem' }}>⚠ Branch Divergence</h3>
            <p style={{ color: 'var(--text-primary)', marginBottom: '1rem', lineHeight: '1.7', fontSize: '0.95rem' }}>You are currently on a different path. To reach <strong>"{story.scenes.find(s => s.id === divergeModal.targetSceneId)?.title}"</strong>, you would need to go back to <strong>"{divergeModal.divergencePoint.title}"</strong> and choose <strong>"{divergeModal.divergenceChoice?.text}"</strong> instead.</p>
            {divergeModal.targetPath && (
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Required path:</div>
                <div style={{ fontSize: '0.85rem', color: 'white', lineHeight: '1.6' }}>{divergeModal.targetPath.path.map((sid, i) => { const scn = story.scenes.find(s => s.id === sid); return (<span key={sid}>{scn?.title}{i < divergeModal.targetPath.choices.length && <span style={{ color: 'var(--accent)', margin: '0 0.3rem' }}> → [{divergeModal.targetPath.choices[i].text}] → </span>}</span>); })}</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="glass-card" style={{ flex: 1, padding: '0.8rem', background: 'var(--primary-gradient)', color: 'white', cursor: 'pointer', fontWeight: 'bold' }} onClick={confirmDiverge}>Retake from "{divergeModal.divergencePoint.title}"</button>
              <button className="glass-card" style={{ flex: 1, padding: '0.8rem', cursor: 'pointer' }} onClick={() => setDivergeModal(null)}>Cancel</button>
            </div>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {showStats && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }} onClick={() => setShowStats(false)}>
            <motion.div initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 50 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="glass-card stats-card" style={{ padding: '3rem', maxWidth: '600px', width: '100%', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
              <h2 className="gradient-text" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Journey Complete</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem' }}>You reached "{currentScene.title}"</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div><div className="stat-number">{visitedScenes.size}</div><div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Scenes Visited</div></div>
                <div><div className="stat-number">{history.length}</div><div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Choices Made</div></div>
                <div><div className="stat-number">{formatTime(elapsedMs)}</div><div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Time Spent</div></div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', textAlign: 'left' }}>
                <h4 style={{ color: 'var(--accent)', marginBottom: '1rem', fontSize: '0.95rem' }}>Your Path</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>{history.concat(currentScene.id).map((sid, i) => { const scn = story.scenes.find(s => s.id === sid); return (<React.Fragment key={sid}>{i > 0 && <span style={{ color: 'rgba(255,255,255,0.2)' }}>→</span>}<span style={{ padding: '4px 10px', background: 'rgba(131,58,180,0.2)', borderRadius: '6px', fontSize: '0.85rem', color: 'white' }}>{scn?.title}</span></React.Fragment>); })}</div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="glass-card" style={{ flex: 1, padding: '1rem', background: 'var(--primary-gradient)', color: 'white', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => { setShowStats(false); stopSpeaking(); stopListening(); setTtsEnabled(false); setVoiceEnabled(false); setPhase('lobby'); }}>Back to Details</button>
                <button className="glass-card" style={{ flex: 1, padding: '1rem', cursor: 'pointer', border: '1px solid var(--glass-border)' }} onClick={() => { setShowStats(false); startReading(true); }}>Play Again</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StoryReader;