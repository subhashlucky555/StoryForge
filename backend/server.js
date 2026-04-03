const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/storyforge', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB Connected')).catch(err => console.error(err));

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Story' }],
  createdAt: { type: Date, default: Date.now },
});

const SceneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: String,
  choices: [{ text: String, hint: String, nextSceneId: String }],
  isEnding: { type: Boolean, default: false },
  id: String,
});

const StorySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  authorName: String,
  coverImage: String,
  scenes: [SceneSchema],
  initialSceneId: String,
  category: { type: String, default: 'Adventure' },
  status: { type: String, enum: ['draft', 'published', 'completed'], default: 'draft' },
  ratings: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    score: Number,
    comment: String,
    createdAt: { type: Date, default: Date.now },
  }],
  sceneComments: [{
    sceneId: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    text: String,
    createdAt: { type: Date, default: Date.now },
  }],
  averageRating: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const ProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story' },
  currentSceneId: String,
  choicesMade: [String],
  lastUpdated: { type: Date, default: Date.now },
});

const User = mongoose.model('User', UserSchema);
const Story = mongoose.model('Story', StorySchema);
const Progress = mongoose.model('Progress', ProgressSchema);

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'storyforge_secret');
    req.user = decoded;
    next();
  } catch (e) {
    res.status(400).json({ message: 'Token is not valid' });
  }
};

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'storyforge_secret');
    res.status(201).json({ token, user: { id: user._id, username, email } });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'storyforge_secret');
    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.post('/api/upload', auth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  res.json({ path: `/uploads/${req.file.filename}` });
});

app.get('/api/stories', async (req, res) => {
  try {
    const stories = await Story.find({ status: { $ne: 'draft' } }).sort({ createdAt: -1 });
    res.json(stories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/stories', auth, async (req, res) => {
  try {
    const story = new Story({ ...req.body, author: req.user.id });
    await story.save();
    res.status(201).json(story);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.get('/api/stories/mine', auth, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const stories = await Story.find({ author: userId }).sort({ createdAt: -1 });
    res.json(stories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/stories/:id', async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });
    res.json(story);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/stories/:id', auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });
    if (story.author.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
    const { author, authorName, _id, ...updateData } = req.body;
    Object.assign(story, updateData);
    await story.save();
    res.json(story);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/stories/:id', auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });
    if (story.author.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
    await Progress.deleteMany({ storyId: story._id });
    await story.deleteOne();
    res.json({ message: 'Story deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/favorites', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('favorites');
    res.json(user.favorites);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/favorites/:storyId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const idx = user.favorites.indexOf(req.params.storyId);
    if (idx > -1) {
      user.favorites.splice(idx, 1);
    } else {
      user.favorites.push(req.params.storyId);
    }
    await user.save();
    const populated = await User.findById(req.user.id).populate('favorites');
    res.json(populated.favorites);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/progress/:storyId', auth, async (req, res) => {
  try {
    const progress = await Progress.findOne({ userId: req.user.id, storyId: req.params.storyId });
    res.json(progress);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/progress', auth, async (req, res) => {
  try {
    const { storyId, currentSceneId, choicesMade } = req.body;
    let progress = await Progress.findOne({ userId: req.user.id, storyId });
    if (progress) {
      progress.currentSceneId = currentSceneId;
      progress.choicesMade = choicesMade;
      progress.lastUpdated = Date.now();
    } else {
      progress = new Progress({ userId: req.user.id, storyId, currentSceneId, choicesMade });
    }
    await progress.save();
    res.json(progress);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/progress/:storyId', auth, async (req, res) => {
  try {
    await Progress.findOneAndDelete({ userId: req.user.id, storyId: req.params.storyId });
    res.json({ message: 'Progress deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/stories/:id/rate', auth, async (req, res) => {
  try {
    const { score, comment } = req.body;
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });
    const existingIdx = story.ratings.findIndex(r => r.userId.toString() === req.user.id);
    if (existingIdx > -1) {
      story.ratings[existingIdx].score = score;
      story.ratings[existingIdx].comment = comment;
    } else {
      story.ratings.push({ userId: req.user.id, username: req.user.username, score, comment });
    }
    story.averageRating = story.ratings.reduce((acc, curr) => acc + curr.score, 0) / story.ratings.length;
    await story.save();
    res.json(story);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.get('/api/stories/:id/scenes/:sceneId/comments', async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });
    const comments = (story.sceneComments || []).filter(c => c.sceneId === req.params.sceneId);
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/stories/:id/scenes/:sceneId/comments', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Comment text is required' });
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });
    if (!story.sceneComments) story.sceneComments = [];
    story.sceneComments.push({
      sceneId: req.params.sceneId,
      userId: req.user.id,
      username: req.user.username,
      text,
    });
    await story.save();
    const newComment = story.sceneComments[story.sceneComments.length - 1];
    res.status(201).json(newComment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const seedSampleStory = async () => {
  const count = await Story.countDocuments();
  if (count > 0) return;
  const sampleStory = new Story({
    title: 'The Cursed Crossroads',
    description: 'A mysterious crossroads where every path leads to a different fate. Choose wisely, for the forest remembers.',
    authorName: 'StoryForge',
    category: 'Fantasy',
    status: 'published',
    initialSceneId: 'start',
    scenes: [
      { id: 'start', title: 'The Crossroads', content: 'You stand at an ancient crossroads shrouded in mist. Three paths diverge before you.\n\nTo the north, a dark forest looms with an eerie green glow pulsing between the trees.\n\nTo the east, a mountain path winds upward through thick clouds, disappearing into the peaks.\n\nTo the south, a gentle stream flows beside an overgrown trail lined with silver flowers.', choices: [{ text: 'Enter the Dark Forest', hint: 'The green glow pulses with raw magic — could be wondrous or deadly.', nextSceneId: 'forest' }, { text: 'Climb the Mountain Path', hint: 'The mountain path looks treacherous but the peaks might hold ancient secrets.', nextSceneId: 'mountain' }, { text: 'Follow the Stream South', hint: 'The stream looks peaceful, but something glints beneath the water\'s surface.', nextSceneId: 'stream' }], isEnding: false },
      { id: 'forest', title: 'The Whispering Woods', content: 'The trees close in around you as you step into the forest. Strange luminescent flowers dot the undergrowth, casting an ethereal blue-green glow. You hear whispered voices carried on the wind — they seem to be calling your name.\n\nAhead, the path splits. One trail leads deeper into the glowing heart of the forest. The other winds toward a crumbling stone tower barely visible through the ancient trees.', choices: [{ text: 'Follow the whispers deeper', hint: 'The whispers grow louder — they might lead to the source of the forest\'s magic.', nextSceneId: 'fairy_clearing' }, { text: 'Investigate the stone tower', hint: 'The tower looks ancient. Someone — or something — may still live there.', nextSceneId: 'tower' }], isEnding: false },
      { id: 'fairy_clearing', title: 'The Fairy Clearing', content: 'You push through a curtain of glowing vines and step into a breathtaking clearing. Tiny winged creatures dance in the air, leaving trails of golden light. In the center, a massive ancient tree pulsates with raw magical energy.\n\nA fairy approaches you, her voice like wind chimes. "You have found the Heart of the Forest. We have waited centuries for one brave enough to enter. Will you accept the forest\'s blessing?"', choices: [{ text: 'Accept the blessing', hint: 'The forest\'s blessing could grant immense power — but at what cost?', nextSceneId: 'ending_blessing' }, { text: 'Decline politely', hint: 'Sometimes refusing power is the wisest choice of all.', nextSceneId: 'ending_wisdom' }], isEnding: false },
      { id: 'tower', title: 'The Hermit\'s Tower', content: 'The tower door creaks open before you even touch it. Inside, spiraling stairs lead up past shelves overflowing with dusty tomes and strange artifacts. At the top, an old hermit sits surrounded by floating orbs of light.\n\n"Ah, another visitor," he says without looking up. "I can offer you knowledge of the past or a glimpse of the future. Choose one."', choices: [{ text: 'Learn about the past', hint: 'Understanding what happened here might explain the curse of the crossroads.', nextSceneId: 'ending_knowledge' }, { text: 'Glimpse the future', hint: 'Seeing what\'s to come could change everything — or drive you mad.', nextSceneId: 'ending_future' }], isEnding: false },
      { id: 'mountain', title: 'The Clouded Peak', content: 'The climb is brutal. Wind tears at your clothes as you ascend above the treeline. Just as your legs begin to fail, you reach a plateau where the clouds part to reveal a magnificent temple carved into the mountainside.\n\nTwo entrances face you. One is adorned with symbols of fire, the other with symbols of ice. A weathered inscription reads: "Passion preserves. Reason endures."', choices: [{ text: 'Enter the Fire Gate', hint: 'Fire represents passion and power. The path beyond radiates intense heat.', nextSceneId: 'ending_fire' }, { text: 'Enter the Ice Gate', hint: 'Ice represents calm and clarity. The air beyond is bitingly cold.', nextSceneId: 'ending_ice' }], isEnding: false },
      { id: 'stream', title: 'The Silver Stream', content: 'You follow the stream as it widens into a shallow river. Beneath the crystal-clear water, you see something extraordinary — the riverbed is paved with silver coins and gemstones, and among them, a gleaming sword rests on a stone pedestal.\n\nAs you reach for it, a water spirit rises from the stream. "That sword has a price, traveler. To wield it, you must sacrifice either your fondest memory or your greatest fear."', choices: [{ text: 'Sacrifice your fondest memory', hint: 'Losing your happiest memory would be painful, but the sword\'s power is undeniable.', nextSceneId: 'ending_memory' }, { text: 'Sacrifice your greatest fear', hint: 'Conquering fear could free you — but the process might be terrifying.', nextSceneId: 'ending_fear' }], isEnding: false },
      { id: 'ending_blessing', title: 'Child of the Forest', content: 'The golden light envelops you completely. When it fades, you find yourself transformed — leaves and vines weave through your hair, and you can feel the heartbeat of every tree in the forest.\n\nYou have become the Forest\'s Guardian, blessed with immortality and power over nature. But as the years pass, you realize you can never leave these woods again. The forest is now your world, and your world is the forest.\n\nTHE END — You became the Forest\'s eternal Guardian.', choices: [], isEnding: true },
      { id: 'ending_wisdom', title: 'The Wise Traveler', content: 'The fairy looks at you with surprise, then smiles warmly. "You are wiser than most who come here. True strength lies in knowing when not to take power."\n\nShe gifts you a single golden seed. "Plant this anywhere, and a piece of this forest will grow — a reminder that the greatest magic is in choosing your own path."\n\nYou leave the forest with the seed safely in your pocket, richer than any king.\n\nTHE END — You chose wisdom over power.', choices: [], isEnding: true },
      { id: 'ending_knowledge', title: 'Keeper of Secrets', content: 'The hermit waves his hand and the room fills with holographic images of the past. You see the crossroads as they were a thousand years ago — a meeting place of gods who cursed the land, creating an eternal loop of travelers making choices.\n\n"Now you know the truth," the hermit says. "But knowing changes nothing. The loop continues." He smiles sadly. "Unless... you stay and help me find a way to break it."\n\nYou stay. Perhaps, together, you can change fate itself.\n\nTHE END — You became a seeker of truth.', choices: [], isEnding: true },
      { id: 'ending_future', title: 'The Shattered Mind', content: 'The orbs of light swirl around you violently. Images flood your mind — a thousand possible futures, branching and splitting endlessly. You see yourself dying in hundreds of ways, living in hundreds more.\n\nWhen the visions stop, you sit on the floor, trembling. You remember everything you saw, and it\'s too much for any mortal mind to hold.\n\nThe hermit sighs and gently leads you to a small room. "You\'ll be comfortable here. Many have made this choice."\n\nTHE END — The future proved too much to bear.', choices: [], isEnding: true },
      { id: 'ending_fire', title: 'The Phoenix Ascendant', content: 'The Fire Gate blazes open and you walk through a tunnel of living flame. The heat is unbearable but doesn\'t burn — it transforms. When you emerge on the other side, you are reborn.\n\nYour body radiates warmth and light. You can feel the fire within you, ready to be unleashed. You descend the mountain as a being of living flame, destined to either save or consume the world below.\n\nTHE END — You became a being of pure fire.', choices: [], isEnding: true },
      { id: 'ending_ice', title: 'The Frozen Sentinel', content: 'The Ice Gate opens silently, revealing a chamber of perfect crystalline beauty. At its center, an ice throne waits. As you approach, frost creeps up your body, slow and painless.\n\nYou sit on the throne and understand — you are to be the mountain\'s eternal sentinel, watching over the world below in perfect still contemplation. Your thoughts become as clear as ice, as vast as the mountain.\n\nTHE END — You became the eternal watcher.', choices: [], isEnding: true },
      { id: 'ending_memory', title: 'The Hollow Victory', content: 'You reach into the water and feel your happiest memory slipping away like sand through fingers. A child\'s laugh, a mother\'s embrace — gone. You can\'t even remember what you lost, only that something is missing.\n\nThe sword is yours. It\'s magnificent — light as a feather and sharp enough to cut shadow. You wield it with mastery, becoming the greatest warrior the land has ever known.\n\nBut on quiet nights, you stare at the stars and weep for something you can\'t name.\n\nTHE END — You gained a legendary sword but lost a piece of your soul.', choices: [], isEnding: true },
      { id: 'ending_fear', title: 'The Unbound Soul', content: 'The water spirit plunges you into the depths of your own mind. You face your greatest fear — being utterly alone in darkness — and for a terrifying moment, you are. Completely, utterly alone.\n\nBut then you realize: you survived it. The darkness didn\'t consume you. You emerge from the water gasping but laughing, free of the fear that had haunted you your entire life.\n\nThe sword dissolves into silver light that merges with your body. You don\'t need a weapon. You are unbreakable.\n\nTHE END — You conquered your deepest fear and emerged truly free.', choices: [], isEnding: true }
    ]
  });
  await sampleStory.save();
  console.log('Sample story seeded');
};

seedSampleStory();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));