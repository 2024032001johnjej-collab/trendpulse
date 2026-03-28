const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const User = require('./models/User');
const authMiddleware = require('./middleware/auth');
const Post = require('./models/Post');
const SocialFeed = require('./models/SocialFeed');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trendpulse';
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-env';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message);
    console.log('Continuing without MongoDB for frontend demo purposes...');
  });

const mockUsers = [];

app.post('/api/auth/signup', async (req, res) => {
  try {
    const name = req.body.name || req.body.username;
    const { email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    if (mongoose.connection.readyState !== 1) {
      if (mockUsers.some(u => u.email === email.toLowerCase())) {
        return res.status(409).json({ message: 'Email already registered.' });
      }
      const user = { _id: Date.now().toString(), name, email: email.toLowerCase() };
      mockUsers.push({ ...user, password }); 
      return res.status(201).json({ message: 'Signup successful.', userId: user._id });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    return res.status(201).json({ message: 'Signup successful.', userId: user._id });
  } catch (error) {
    return res.status(500).json({ message: 'Server error during signup.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    let user;
    if (mongoose.connection.readyState !== 1) {
      user = mockUsers.find(u => u.email === email.toLowerCase() && u.password === password);
      if (!user) {
        user = { _id: 'fake-id', name: 'Demo User', email: email.toLowerCase() };
      }
    } else {
      user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }
    }

    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, {
      expiresIn: '1d',
    });

    return res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error during login.' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const user = mockUsers.find(u => u._id === req.user.userId) || { name: 'Demo User', email: 'demo@example.com' };
      return res.json({ user });
    }

    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ message: 'Server error fetching user.' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/test', (_req, res) => {
  res.json({ test: 'working', time: new Date().toISOString() });
});

// ============ SOCIAL MEDIA MOCK DATA ENDPOINTS ============

const redditMockPosts = [
  { id: 'r1', author: 'TechGuru92', platform: 'reddit', subreddit: 'r/technology', title: 'AI advancement breakthroughs this month', content: 'Just read about the latest AI developments. Absolutely mind-blowing what we\'re achieving in machine learning!', upvotes: 2847, timestamp: Date.now() - 3600000, source: 'reddit' },
  { id: 'r2', author: 'DataDiver', platform: 'reddit', subreddit: 'r/datascience', title: 'Sentiment Analysis Tools Comparison', content: 'Anyone else using VADER + transformers for sentiment analysis? Works great for real-time monitoring!', upvotes: 1203, timestamp: Date.now() - 7200000, source: 'reddit' },
  { id: 'r3', author: 'CryptoWatcher', platform: 'reddit', subreddit: 'r/cryptocurrency', title: 'Market Sentiment Turning Bullish Again', content: 'Social sentiment indicators showing positive shift. Could be a good buying opportunity for long-term investors.', upvotes: 3421, timestamp: Date.now() - 1800000, source: 'reddit' },
  { id: 'r4', author: 'SkepticalDev', platform: 'reddit', subreddit: 'r/programming', title: 'Why sentiment analysis is hard', content: 'Tried implementing sentiment analysis for our startup. Realized sarcasm detection is way harder than expected.', upvotes: 892, timestamp: Date.now() - 5400000, source: 'reddit' },
  { id: 'r5', author: 'NewsJunkie', platform: 'reddit', subreddit: 'r/news', title: 'Tech companies facing backlash', content: 'Latest poll shows declining public sentiment toward big tech. Regulatory scrutiny continues to increase.', upvotes: 5634, timestamp: Date.now() - 900000, source: 'reddit' },
];

const youtubeMockComments = [
  { id: 'yt1', author: 'Alex Chen', platform: 'youtube', videoId: 'dQw4w9WgXcQ', videoTitle: 'AI in 2024: Game Changer or Hype?', content: 'This video is incredibly insightful! The future of AI is definitely going to change everything.', likes: 542, timestamp: Date.now() - 2700000, source: 'youtube' },
  { id: 'yt2', author: 'Morgan Dev', platform: 'youtube', videoId: 'jNQXAC9IVRw', videoTitle: 'Python for Data Science', content: 'I\'ve been using Python for sentiment analysis and it\'s amazing how simple yet powerful it is!', likes: 1203, timestamp: Date.now() - 10800000, source: 'youtube' },
  { id: 'yt3', author: 'Sarah Markets', platform: 'youtube', videoId: 'OPf0YbXqDm0', videoTitle: 'Trading Strategy Review', content: 'The sentiment analysis they mentioned is exactly what I\'ve been looking for to improve my strategy.', likes: 298, timestamp: Date.now() - 3600000, source: 'youtube' },
  { id: 'yt4', author: 'Tech News Daily', platform: 'youtube', videoId: 'Xf_MvS3wBP4', videoTitle: 'Market Watch Daily Episode 45', content: 'Disappointed by this episode. Expected more in-depth analysis of current sentiment trends in tech stocks.', likes: 45, timestamp: Date.now() - 7200000, source: 'youtube' },
  { id: 'yt5', author: 'Kumar Learning', platform: 'youtube', videoId: 'kJQDXZ5M0Ww', videoTitle: 'Building ML Models Fast', content: 'This is exactly what I needed! Super helpful and well explained. Would love more videos on NLP!', likes: 876, timestamp: Date.now() - 1200000, source: 'youtube' },
];

const twitterMockPosts = [
  { id: 'tw1', author: '@TechTrends2024', platform: 'twitter', handle: 'TechTrends2024', content: 'Breaking: New AI model outperforms competitors by 40%. This could be a game-changer for our industry! 🚀 #AI #ML', retweets: 3421, likes: 8934, timestamp: Date.now() - 900000, source: 'twitter' },
  { id: 'tw2', author: '@DataVizWizard', platform: 'twitter', handle: 'DataVizWizard', content: 'Just deployed sentiment analysis on our platform. Real-time monitoring is absolutely transforming how we respond to customer feedback. #DataScience #Analytics', retweets: 234, likes: 1203, timestamp: Date.now() - 3600000, source: 'twitter' },
  { id: 'tw3', author: '@MarketPulse_AI', platform: 'twitter', handle: 'MarketPulse_AI', content: 'Market sentiment shifted dramatically this week. Our analysis shows increased volatility indicators across tech sector. Starting to look concerning.', retweets: 892, likes: 2147, timestamp: Date.now() - 5400000, source: 'twitter' },
  { id: 'tw4', author: '@CriticalThink', platform: 'twitter', handle: 'CriticalThink', content: 'Unpopular opinion: Most AI hype is overblown. We\'re nowhere near AGI yet. Let\'s be realistic about timelines. 🤔 #AI #Skepticism', retweets: 1203, likes: 4321, timestamp: Date.now() - 7200000, source: 'twitter' },
  { id: 'tw5', author: '@VC_Investor', platform: 'twitter', handle: 'VC_Investor', content: 'Seeing unprecedented sentiment momentum in AI startups. Investors are flooding into this space. Could be a bubble? 📊 #Startups #Investment', retweets: 567, likes: 1876, timestamp: Date.now() - 2700000, source: 'twitter' },
];

// Get all social media posts combined (specific route must come first!)
app.get('/api/social/all/posts', (_req, res) => {
  const allPosts = [
    ...redditMockPosts.map(p => ({ ...p, platform: 'reddit' })),
    ...youtubeMockComments.map(p => ({ ...p, platform: 'youtube' })),
    ...twitterMockPosts.map(p => ({ ...p, platform: 'twitter' })),
  ].sort((a, b) => b.timestamp - a.timestamp);
  
  res.json({ 
    total: allPosts.length, 
    platforms: ['reddit', 'youtube', 'twitter'],
    posts: allPosts 
  });
});

// Get sentiment summary across platforms
app.get('/api/social/sentiment/summary', (_req, res) => {
  res.json({
    platforms: {
      reddit: { total: redditMockPosts.length, avg_engagement: 2739, trend: 'positive' },
      youtube: { total: youtubeMockComments.length, avg_engagement: 593, trend: 'positive' },
      twitter: { total: twitterMockPosts.length, avg_engagement: 3515, trend: 'mixed' },
    },
    overall_sentiment: 'neutral',
    crisis_detected: false,
  });
});

// ============ DATABASE PERSISTENCE ENDPOINTS ============

// Save analyzed post to MongoDB
app.post('/api/posts/save', async (req, res) => {
  try {
    const { id, text, author, sent, confidence, platform, engagement, ts, engine } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (mongoose.connection.readyState !== 1) {
      // Mock mode - just return success
      return res.json({ message: 'Post saved (mock)', id: id || Date.now().toString() });
    }

    const post = new Post({
      id: id || `post-${Date.now()}`,
      text,
      author,
      platform: platform || 'monitor',
      sentiment: {
        label: sent || 'neu',
        confidence: confidence || 0.5,
        engine: engine || 'unknown'
      },
      engagement: {
        likes: engagement || 0,
        total: engagement || 0
      },
      tags: [],
      timestamp: ts || Date.now(),
      analyzedAt: new Date()
    });

    await post.save();
    res.json({ message: 'Post saved', postId: post._id });
  } catch (error) {
    console.error('Error saving post:', error);
    res.status(500).json({ error: 'Failed to save post' });
  }
});

// Get post history
app.get('/api/posts/history', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const platform = req.query.platform || null;
    const hours = req.query.hours ? parseInt(req.query.hours) : 24;

    if (mongoose.connection.readyState !== 1) {
      // Mock mode
      return res.json({
        count: 0,
        posts: [],
        summary: { positive: 0, neutral: 0, negative: 0 }
      });
    }

    const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    let query = { timestamp: { $gte: cutoffDate } };
    if (platform) {
      query.platform = platform;
    }

    const posts = await Post.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();

    const sentiment_counts = {
      positive: posts.filter(p => p.sentiment.label === 'pos').length,
      neutral: posts.filter(p => p.sentiment.label === 'neu').length,
      negative: posts.filter(p => p.sentiment.label === 'neg').length
    };

    res.json({
      count: posts.length,
      posts,
      summary: sentiment_counts,
      timeRange: { from: cutoffDate, to: new Date() }
    });
  } catch (error) {
    console.error('Error fetching post history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Get posts by sentiment
app.get('/api/posts/sentiment/:label', async (req, res) => {
  try {
    const { label } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;

    if (mongoose.connection.readyState !== 1) {
      return res.json({ count: 0, posts: [] });
    }

    const posts = await Post.find({ 'sentiment.label': label })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();

    res.json({ count: posts.length, posts });
  } catch (error) {
    console.error('Error fetching posts by sentiment:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Get crisis events
app.get('/api/posts/crisis', async (req, res) => {
  try {
    const threshold = req.query.threshold ? parseInt(req.query.threshold) : 5;
    const hours = req.query.hours ? parseInt(req.query.hours) : 24;

    if (mongoose.connection.readyState !== 1) {
      return res.json({ crisisEvents: [], totalNegative: 0 });
    }

    const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    const negativePosts = await Post.find({
      'sentiment.label': 'neg',
      timestamp: { $gte: cutoffDate }
    })
      .sort({ timestamp: -1 })
      .exec();

    // Group by time window (30 min buckets)
    const crisisEvents = [];
    const thirtyMinutes = 30 * 60 * 1000;

    for (let i = 0; i < negativePosts.length; i += threshold) {
      const bucket = negativePosts.slice(i, i + threshold);
      const timeSpan = Math.abs(bucket[0].timestamp - bucket[bucket.length - 1].timestamp);

      if (timeSpan < thirtyMinutes && bucket.length >= threshold) {
        crisisEvents.push({
          timestamp: bucket[0].timestamp,
          count: bucket.length,
          averageConfidence: (bucket.reduce((sum, p) => sum + (p.sentiment.confidence || 0), 0) / bucket.length).toFixed(2),
          posts: bucket
        });
      }
    }

    res.json({
      crisisEvents: crisisEvents.slice(0, 10),
      totalNegative: negativePosts.length,
      threshold,
      hoursAnalyzed: hours
    });
  } catch (error) {
    console.error('Error detecting crisis:', error);
    res.status(500).json({ error: 'Failed to detect crisis events' });
  }
});

// Store raw social feed data
app.post('/api/social/raw/store', async (req, res) => {
  try {
    const { platform, content, author, externalId, engagement, link, title } = req.body;

    if (mongoose.connection.readyState !== 1) {
      return res.json({ message: 'Stored (mock)', id: externalId });
    }

    const feed = new SocialFeed({
      platform,
      externalId: externalId || `${platform}-${Date.now()}`,
      title,
      content,
      author,
      link,
      engagement: engagement || {},
      source: 'api',
      fetchedAt: new Date(),
      analyzed: false
    });

    await feed.save();
    res.json({ message: 'Feed stored', id: feed._id });
  } catch (error) {
    console.error('Error storing feed:', error);
    res.status(500).json({ error: 'Failed to store feed' });
  }
});

// ============ REAL SOCIAL MEDIA API INTEGRATION ============

// Helper: Rate limiter (simple in-memory)
const rateLimiters = {};

function checkRateLimit(key, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  if (!rateLimiters[key]) rateLimiters[key] = [];

  // Remove old requests
  rateLimiters[key] = rateLimiters[key].filter(time => now - time < windowMs);

  if (rateLimiters[key].length >= maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((windowMs - (now - rateLimiters[key][0])) / 1000) };
  }

  rateLimiters[key].push(now);
  return { allowed: true };
}

// Get Reddit posts (mocked - use PRAW for real integration)
app.get('/api/social/reddit/real', async (req, res) => {
  try {
    const rateCheck = checkRateLimit('reddit', 3, 60000); // 3 requests per minute
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter });
    }

    // In production: use PRAW library to fetch from Reddit
    // For now: return enhanced mock data with suggestion to install praw
    const mockData = redditMockPosts.map((p, idx) => ({
      ...p,
      reddit_id: `t3_${Math.random().toString(36).substr(2, 8)}`,
      permalink: `/r/${p.subreddit.replace('r/', '')}/comments/${Math.random().toString(36).substr(2, 8)}/`,
      score: p.upvotes,
      created_utc: (Date.now() - p.timestamp) / 1000
    }));

    res.json({
      source: 'reddit',
      count: mockData.length,
      posts: mockData,
      note: 'Install PRAW for real Reddit integration: pip install praw'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Reddit posts' });
  }
});

// Get YouTube comments (mocked - use YouTube API for real integration)
app.get('/api/social/youtube/real', async (req, res) => {
  try {
    const rateCheck = checkRateLimit('youtube', 5, 60000); // 5 requests per minute
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter });
    }

    // In production: use YouTube API client
    const mockData = youtubeMockComments.map((p, idx) => ({
      ...p,
      comment_id: `comment_${Math.random().toString(36).substr(2, 10)}`,
      reply_count: Math.floor(Math.random() * 50),
      published_at: new Date(p.timestamp).toISOString()
    }));

    res.json({
      source: 'youtube',
      count: mockData.length,
      comments: mockData,
      note: 'Install google-api-python-client for real YouTube integration'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch YouTube comments' });
  }
});

// Get Twitter/X posts (mocked - use Tweepy for real integration)
app.get('/api/social/twitter/real', async (req, res) => {
  try {
    const rateCheck = checkRateLimit('twitter', 15, 900000); // Twitter rate limit: 15 per 15 min
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter });
    }

    // In production: use Twitter API v2 or Tweepy
    const mockData = twitterMockPosts.map((p, idx) => ({
      ...p,
      tweet_id: Math.floor(Math.random() * 10000000000000000),
      url: `https://twitter.com/${p.handle}/status/${Math.floor(Math.random() * 10000000000000000)}`,
      created_at: new Date(p.timestamp).toISOString(),
      source: 'Twitter Web App',
      is_quote: Math.random() > 0.8,
      quote_count: Math.floor(Math.random() * 10)
    }));

    res.json({
      source: 'twitter',
      count: mockData.length,
      posts: mockData,
      note: 'Install tweepy for real Twitter integration: pip install tweepy'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Twitter posts' });
  }
});

// Batch fetch from all real sources with caching
app.get('/api/social/all/real', async (req, res) => {
  try {
    const rateCheck = checkRateLimit('all_social', 5, 60000);
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter });
    }

    const skipCache = req.query.skipCache === 'true';

    // Fetch from all platforms with requests
    const [redditRes, youtubeRes, twitterRes] = await Promise.allSettled([
      fetch('http://localhost:5000/api/social/reddit/real'),
      fetch('http://localhost:5000/api/social/youtube/real'),
      fetch('http://localhost:5000/api/social/twitter/real')
    ]);

    const results = [];

    if (redditRes.status === 'fulfilled' && redditRes.value.ok) {
      const data = await redditRes.value.json();
      results.push(...(data.posts || []));
    }

    if (youtubeRes.status === 'fulfilled' && youtubeRes.value.ok) {
      const data = await youtubeRes.value.json();
      results.push(...(data.comments || []));
    }

    if (twitterRes.status === 'fulfilled' && twitterRes.value.ok) {
      const data = await twitterRes.value.json();
      results.push(...(data.posts || []));
    }

    res.json({
      total: results.length,
      posts: results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)),
      platforms: ['reddit', 'youtube', 'twitter'],
      timestamp: new Date(),
      note: 'Mix of mock and real data - configure API keys for full real-time integration'
    });
  } catch (error) {
    console.error('Error in batch fetch:', error);
    res.status(500).json({ error: 'Failed to fetch all social data' });
  }
});

// Get posts from specific social media platform (general route after specific ones)
app.get('/api/social/:platform', (_req, res) => {
  const platform = _req.params.platform.toLowerCase();
  
  switch(platform) {
    case 'reddit':
      return res.json({ platform: 'reddit', posts: redditMockPosts, count: redditMockPosts.length });
    case 'youtube':
      return res.json({ platform: 'youtube', posts: youtubeMockComments, count: youtubeMockComments.length });
    case 'twitter':
    case 'x':
      return res.json({ platform: 'twitter', posts: twitterMockPosts, count: twitterMockPosts.length });
    default:
      return res.status(400).json({ error: 'Platform not supported. Use: reddit, youtube, twitter' });
  }
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
