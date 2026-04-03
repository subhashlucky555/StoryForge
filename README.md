## What is StoryForge?

StoryForge is an immersive, interactive fiction platform designed to transform reading from a passive experience into a dynamic journey. It allows users to craft complex, branching narratives using a rich text editor and experience them like a premium audiobook—complete with voice-activated choices, word-by-word glowing highlights, and visual story maps. It bridges the gap between Choose-Your-Own-Adventure books and modern visual novels, entirely free of paid AI APIs.

## Key Features

📝 **Advanced Story Editor**
- **Rich Text Formatting:** Full support for bold, italics, headings, lists, blockquotes, and dividers via TipTap.
- **Direct Image Embedding:** Upload images directly into scene content or via URL.
- **Intuitive Tree View:** Visualize your branching narrative and identify unreachable scenes instantly.

🌳 **Visual Story Constellation**
- **Interactive Map:** Pan and zoom across a dynamically generated tree of your story's paths.
- **Divergence Tracking:** Easily see your current path versus unexplored branches.
- **Quick-Jump:** Click any node on the map to teleport back to that exact story moment (with divergence warnings).

🔊 **Immersive AudioBook Mode**
- **Voice Selection:** Choose from a dynamic list of voices available natively on your device.
- **Word-by-Word Glow:** A hybrid tracking system guarantees smooth, real-time text highlighting that follows the audio perfectly, even if the browser drops native events.
- **Volume Control:** Dedicated slider to adjust audio levels (0% to 200%).

🎤 **Hands-Free Voice Activation**
- **Voice Commands:** Speak your choice aloud to progress through the story without clicking.
- **Smart Matching:** Advanced filtering ignores stop words ("the", "and") to accurately match your intent to the correct choice.
- **Visual Feedback:** Pulsing UI and live transcription show exactly what the microphone is hearing.

💬 **Deep Reader Engagement**
- **Scene-Specific Comments:** Instead of reviewing the whole book, readers can drop reactions directly on plot twists or beautiful prose.
- **End-of-Story Statistics:** Upon reaching an ending, readers are greeted with a beautiful stat card showing their unique path, scenes visited, choices made, and time spent.

🔐 **Seamless Progress & Social System**
- **Auto-Save:** Reading progress is saved automatically to the cloud for logged-in users.
- **Favorites & Ratings:** Like stories and leave overall reviews with star ratings.
- **Flexible Auth:** Read as a guest, or create an account to save progress and write stories.

## Tech Stack

**Backend:**
- Node.js & Express (Web framework)
- MongoDB & Mongoose (Database & ODM)
- Multer (Image upload handling)
- JWT & Bcryptjs (Authentication & Security)

**Frontend:**
- React & React Router (UI & Routing)
- TipTap (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`) (Rich Text Editor)
- Framer Motion (Smooth animations & page transitions)
- Native Web Speech API (Text-to-Speech & Speech Recognition - Zero cost)
- Axios (API communication)

**Styling:**
- Custom CSS (Glassmorphism, Gradient text, Floating UI)
- No external UI libraries required (Pure CSS magic)

## Quick Start Guide

### Prerequisites
- Node.js & npm/yarn
- MongoDB (local or cloud)

### Installation Steps

1. **Clone the repository**

2. **Install backend dependencies**
```bash
cd backend
yarn install
```

3. **Run backend server**
```bash
yarn start
```
*(Note: The server automatically seeds a sample story called "The Cursed Crossroads" on first run).*

4. **Open a new terminal and install frontend dependencies**
```bash
cd frontend
yarn install
```

5. **Run frontend server**
```bash
yarn start
```

## API Endpoints

**Authentication:**
- POST /api/auth/register - Create new account
- POST /api/auth/login - User login

**Story Management (Library & Reader):**
- GET /api/stories - Fetch all Published/Completed stories
- GET /api/stories/:id - Fetch single story details
- POST /api/stories/:id/rate - Submit overall story review (1-5 stars + comment)
- GET /api/favorites - Get user's favorited stories
- POST /api/favorites/:storyId - Toggle favorite status

**Story Editor (Creator):**
- GET /api/stories/mine - Fetch stories created by logged-in user
- POST /api/stories - Create a new story
- PUT /api/stories/:id - Update story details/scenes
- DELETE /api/stories/:id - Delete a story permanently
- POST /api/upload - Upload cover image or in-content image

**Reading Progress:**
- GET /api/progress/:storyId - Fetch saved progress for a story
- POST /api/progress - Save current scene and choice history
- DELETE /api/progress/:storyId - Reset progress to start over

**Scene-Specific Comments (New):**
- GET /api/stories/:id/scenes/:sceneId/comments - Fetch comments for a specific scene
- POST /api/stories/:id/scenes/:sceneId/comments - Leave a comment on a scene

## Configuration Details

**MongoDB Setup:**
- Local: Install MongoDB Community Server.
- Cloud: Use MongoDB Atlas (free tier available).
- The database initializes collections for Users, Stories, and Progress automatically.

**Image Uploads:**
- Images are stored locally in an `uploads/` directory in the backend.
- They are served statically via `app.use('/uploads', express.static('uploads'))`.

**Voice & Audio:**
- StoryForge relies entirely on the browser's native `window.speechSynthesis` and `window.SpeechRecognition`.
- Available voices depend on the user's operating system and browser (Chrome/Edge typically have the best selection).

**Rich Text Storage:**
- Scene content is stored in the database as raw HTML generated by TipTap. It is rendered safely in the reader using `dangerouslySetInnerHTML`.

## License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

© 2026 Subhash Ujwal, Sanjana Suryadevara, Eswar Vutukuri

## Acknowledgments

Special thanks to the TipTap team for providing such a powerful and extensible rich text editor for React. Thanks to the modern Web API standards for making browser-native Text-to-Speech and Voice Recognition possible without paid third-party APIs. Finally, thanks to the Mongoose and Express communities for making backend development with MongoDB an absolute breeze.